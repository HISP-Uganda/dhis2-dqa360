import React, { useState, useEffect } from 'react'
import { useDataQuery, useDataMutation } from '@dhis2/app-runtime'
import { 
    Box, 
    Button, 
    ButtonStrip,
    NoticeBox,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    Tag,
    InputField,
    SingleSelect,
    SingleSelectOption,
    CircularLoader,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Switch,
    Card
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const SectionContainer = styled.div`
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e8eaed;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const SectionTitle = styled.h3`
    margin: 0 0 20px 0;
    font-size: 20px;
    font-weight: 600;
    color: #1a73e8;
    display: flex;
    align-items: center;
    gap: 12px;
`

const SearchContainer = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    align-items: flex-end;
`

const StatsContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
`

const StatCard = styled.div`
    background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    
    h4 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
    }
    
    p {
        margin: 0;
        opacity: 0.9;
        font-size: 14px;
    }
`

// Query to get all users
const usersQuery = {
    users: {
        resource: 'users',
        params: {
            fields: 'id,displayName,username,email,userRoles[id,displayName],disabled',
            pageSize: 100
        }
    }
}

// Query to get DQA360 user roles
const userRolesQuery = {
    userRoles: {
        resource: 'userRoles',
        params: {
            fields: 'id,displayName,name',
            filter: 'name:like:DQA360'
        }
    }
}

// Mutation to update user roles
const updateUserMutation = {
    resource: 'users',
    type: 'update',
    id: ({ id }) => id,
    data: ({ userRoles }) => ({ userRoles })
}

export const DQAUserManagement = () => {
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [selectedUser, setSelectedUser] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [userRoleAssignments, setUserRoleAssignments] = useState({})

    const { loading: usersLoading, error: usersError, data: usersData, refetch: refetchUsers } = useDataQuery(usersQuery)
    const { loading: rolesLoading, error: rolesError, data: rolesData } = useDataQuery(userRolesQuery)
    const [updateUser, { loading: updateLoading }] = useDataMutation(updateUserMutation)

    const dqaRoles = rolesData?.userRoles || []
    const allUsers = usersData?.users?.users || []

    // Filter users to show only those with DQA360 roles or potential candidates
    const dqaUsers = allUsers.filter(user => {
        const hasDQARole = user.userRoles?.some(role => 
            role.displayName?.includes('DQA360') || role.name?.includes('DQA360')
        )
        const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (roleFilter === 'admin') {
            return hasDQARole && user.userRoles?.some(role => role.name?.includes('DQA360_ADMIN')) && matchesSearch
        } else if (roleFilter === 'user') {
            return hasDQARole && user.userRoles?.some(role => role.name?.includes('DQA360_USER')) && matchesSearch
        } else if (roleFilter === 'none') {
            return !hasDQARole && matchesSearch
        }
        
        return matchesSearch
    })

    const stats = {
        total: dqaUsers.length,
        admins: dqaUsers.filter(user => user.userRoles?.some(role => role.name?.includes('DQA360_ADMIN'))).length,
        users: dqaUsers.filter(user => user.userRoles?.some(role => role.name?.includes('DQA360_USER'))).length,
        inactive: dqaUsers.filter(user => user.disabled).length
    }

    const handleEditUser = (user) => {
        setSelectedUser(user)
        const currentRoles = {}
        dqaRoles.forEach(role => {
            currentRoles[role.id] = user.userRoles?.some(userRole => userRole.id === role.id) || false
        })
        setUserRoleAssignments(currentRoles)
        setShowEditModal(true)
    }

    const handleSaveUser = async () => {
        if (!selectedUser) return

        try {
            const assignedRoles = dqaRoles
                .filter(role => userRoleAssignments[role.id])
                .map(role => ({ id: role.id }))

            // Keep existing non-DQA roles
            const existingNonDQARoles = selectedUser.userRoles?.filter(role => 
                !role.displayName?.includes('DQA360') && !role.name?.includes('DQA360')
            ) || []

            const allRoles = [...existingNonDQARoles, ...assignedRoles]

            await updateUser({
                id: selectedUser.id,
                userRoles: allRoles
            })

            setShowEditModal(false)
            setSelectedUser(null)
            refetchUsers()
        } catch (error) {
            console.error('Error updating user:', error)
        }
    }

    const getUserDQARole = (user) => {
        const adminRole = user.userRoles?.find(role => role.name?.includes('DQA360_ADMIN'))
        const userRole = user.userRoles?.find(role => role.name?.includes('DQA360_USER'))
        
        if (adminRole) return { type: 'admin', name: 'DQA360 Admin' }
        if (userRole) return { type: 'user', name: 'DQA360 User' }
        return { type: 'none', name: 'No DQA Access' }
    }

    if (usersLoading || rolesLoading) {
        return (
            <Box display="flex" justifyContent="center" padding="48px">
                <CircularLoader />
            </Box>
        )
    }

    if (usersError || rolesError) {
        return (
            <NoticeBox error title={i18n.t('Error loading data')}>
                {usersError?.message || rolesError?.message}
            </NoticeBox>
        )
    }

    return (
        <Box>
            <SectionContainer>
                <SectionTitle>
                    👥 {i18n.t('DQA360 User Management')}
                </SectionTitle>
                
                <NoticeBox title={i18n.t('User Access Management')}>
                    {i18n.t('Manage DQA360 access for existing DHIS2 users. You can assign or remove DQA360 Admin and User roles.')}
                </NoticeBox>

                <Box marginTop="24px">
                    <StatsContainer>
                        <StatCard>
                            <h4>{stats.total}</h4>
                            <p>{i18n.t('Total Users')}</p>
                        </StatCard>
                        <StatCard style={{ background: 'linear-gradient(135deg, #34a853 0%, #4caf50 100%)' }}>
                            <h4>{stats.admins}</h4>
                            <p>{i18n.t('DQA360 Admins')}</p>
                        </StatCard>
                        <StatCard style={{ background: 'linear-gradient(135deg, #fbbc04 0%, #ff9800 100%)' }}>
                            <h4>{stats.users}</h4>
                            <p>{i18n.t('DQA360 Users')}</p>
                        </StatCard>
                        <StatCard style={{ background: 'linear-gradient(135deg, #ea4335 0%, #f44336 100%)' }}>
                            <h4>{stats.inactive}</h4>
                            <p>{i18n.t('Inactive Users')}</p>
                        </StatCard>
                    </StatsContainer>
                </Box>

                <SearchContainer>
                    <Box flex="1">
                        <InputField
                            label={i18n.t('Search Users')}
                            value={searchTerm}
                            onChange={({ value }) => setSearchTerm(value)}
                            placeholder={i18n.t('Search by name, username, or email...')}
                        />
                    </Box>
                    <Box width="200px">
                        <SingleSelect
                            label={i18n.t('Filter by Role')}
                            selected={roleFilter}
                            onChange={({ selected }) => setRoleFilter(selected)}
                        >
                            <SingleSelectOption value="all" label={i18n.t('All Users')} />
                            <SingleSelectOption value="admin" label={i18n.t('DQA360 Admins')} />
                            <SingleSelectOption value="user" label={i18n.t('DQA360 Users')} />
                            <SingleSelectOption value="none" label={i18n.t('No DQA Access')} />
                        </SingleSelect>
                    </Box>
                </SearchContainer>

                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('User')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Username')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Email')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('DQA360 Role')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {dqaUsers.map(user => {
                            const dqaRole = getUserDQARole(user)
                            return (
                                <DataTableRow key={user.id}>
                                    <DataTableCell>
                                        <strong>{user.displayName}</strong>
                                    </DataTableCell>
                                    <DataTableCell>{user.username}</DataTableCell>
                                    <DataTableCell>{user.email || '-'}</DataTableCell>
                                    <DataTableCell>
                                        <Tag 
                                            positive={dqaRole.type === 'admin'}
                                            neutral={dqaRole.type === 'user'}
                                            negative={dqaRole.type === 'none'}
                                        >
                                            {dqaRole.name}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Tag 
                                            positive={!user.disabled}
                                            negative={user.disabled}
                                        >
                                            {user.disabled ? i18n.t('Inactive') : i18n.t('Active')}
                                        </Tag>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <Button 
                                            small 
                                            secondary
                                            onClick={() => handleEditUser(user)}
                                        >
                                            {i18n.t('Manage Access')}
                                        </Button>
                                    </DataTableCell>
                                </DataTableRow>
                            )
                        })}
                    </DataTableBody>
                </DataTable>

                {dqaUsers.length === 0 && (
                    <Box padding="48px" textAlign="center">
                        <p>{i18n.t('No users found matching your search criteria.')}</p>
                    </Box>
                )}
            </SectionContainer>

            {showEditModal && selectedUser && (
                <Modal onClose={() => setShowEditModal(false)} large>
                    <ModalTitle>
                        {i18n.t('Manage DQA360 Access for {{name}}', { name: selectedUser.displayName })}
                    </ModalTitle>
                    <ModalContent>
                        <Box marginBottom="24px">
                            <NoticeBox>
                                {i18n.t('Assign or remove DQA360 roles for this user. Other DHIS2 roles will remain unchanged.')}
                            </NoticeBox>
                        </Box>

                        <Box marginBottom="16px">
                            <strong>{i18n.t('User Information:')}</strong>
                            <p>{i18n.t('Name: {{name}}', { name: selectedUser.displayName })}</p>
                            <p>{i18n.t('Username: {{username}}', { username: selectedUser.username })}</p>
                            {selectedUser.email && <p>{i18n.t('Email: {{email}}', { email: selectedUser.email })}</p>}
                        </Box>

                        <Box marginTop="24px">
                            <h4>{i18n.t('DQA360 Role Assignment:')}</h4>
                            {dqaRoles.map(role => (
                                <Box key={role.id} marginBottom="16px">
                                    <Switch
                                        label={role.displayName}
                                        checked={userRoleAssignments[role.id] || false}
                                        onChange={({ checked }) => 
                                            setUserRoleAssignments(prev => ({
                                                ...prev,
                                                [role.id]: checked
                                            }))
                                        }
                                    />
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                                        {role.name?.includes('ADMIN') 
                                            ? i18n.t('Full administrative access to DQA360')
                                            : i18n.t('Standard user access to DQA360')
                                        }
                                    </p>
                                </Box>
                            ))}
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setShowEditModal(false)}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button 
                                primary 
                                onClick={handleSaveUser}
                                disabled={updateLoading}
                            >
                                {updateLoading ? i18n.t('Saving...') : i18n.t('Save Changes')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Box>
    )
}