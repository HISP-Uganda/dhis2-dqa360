import React, { useState } from 'react'
import { 
    Box, 
    Button, 
    NoticeBox,
    IconSettings24,
    IconAdd24,
    IconEdit24,
    IconDelete24,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    Tag,
    Input,
    SingleSelect,
    SingleSelectOption
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

const SectionContainer = styled.div`
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e0e0e0;
`

const SectionTitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 12px;
`

const ActionBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
`

const FilterBar = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
`

export const UserManagement = () => {
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    
    // Mock user data
    const [users, setUsers] = useState([
        {
            id: '1',
            username: 'admin',
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@dqa360.org',
            role: 'Administrator',
            status: 'Active',
            lastLogin: '2024-01-15 10:30:00',
            assessments: 25,
            created: '2023-01-01'
        },
        {
            id: '2',
            username: 'analyst1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@health.gov',
            role: 'Data Analyst',
            status: 'Active',
            lastLogin: '2024-01-14 16:45:00',
            assessments: 12,
            created: '2023-03-15'
        },
        {
            id: '3',
            username: 'reviewer1',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@health.gov',
            role: 'Data Reviewer',
            status: 'Active',
            lastLogin: '2024-01-13 09:15:00',
            assessments: 8,
            created: '2023-06-20'
        },
        {
            id: '4',
            username: 'operator1',
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.johnson@health.gov',
            role: 'Data Entry',
            status: 'Inactive',
            lastLogin: '2023-12-20 14:20:00',
            assessments: 3,
            created: '2023-09-10'
        }
    ])

    // Filter users based on search and filters
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' || 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesRole = roleFilter === '' || user.role === roleFilter
        const matchesStatus = statusFilter === '' || user.status === statusFilter
        
        return matchesSearch && matchesRole && matchesStatus
    })

    const handleCreateUser = () => {
        // TODO: Implement user creation
        console.log('Create new user')
    }

    const handleEditUser = (userId) => {
        // TODO: Implement user editing
        console.log('Edit user:', userId)
    }

    const handleDeleteUser = (userId) => {
        // TODO: Implement user deletion
        console.log('Delete user:', userId)
    }

    const handleToggleUserStatus = (userId) => {
        setUsers(prev => prev.map(user => 
            user.id === userId 
                ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
                : user
        ))
        setSuccessMessage('✅ User status updated successfully')
    }

    const roles = ['Administrator', 'Data Analyst', 'Data Reviewer', 'Data Entry']
    const statuses = ['Active', 'Inactive']

    return (
        <div>
            {/* Success/Error Messages */}
            {successMessage && (
                <NoticeBox title={i18n.t('Success')} valid style={{ marginBottom: '24px' }}>
                    {successMessage}
                </NoticeBox>
            )}
            
            {errorMessage && (
                <NoticeBox title={i18n.t('Error')} error style={{ marginBottom: '24px' }}>
                    {errorMessage}
                </NoticeBox>
            )}

            {/* User Management */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('User Management')}
                </SectionTitle>
                
                <ActionBar>
                    <div>
                        <strong>{filteredUsers.length}</strong> {i18n.t('users found')} 
                        {searchTerm || roleFilter || statusFilter ? (
                            <span style={{ color: '#666', marginLeft: '8px' }}>
                                ({users.length} total)
                            </span>
                        ) : null}
                    </div>
                    <Button primary onClick={handleCreateUser}>
                        <IconAdd24 />
                        {i18n.t('Create User')}
                    </Button>
                </ActionBar>
                
                <FilterBar>
                    <Box style={{ minWidth: '200px' }}>
                        <Input
                            placeholder={i18n.t('Search users...')}
                            value={searchTerm}
                            onChange={({ value }) => setSearchTerm(value)}
                        />
                    </Box>
                    
                    <Box style={{ minWidth: '150px' }}>
                        <SingleSelect
                            placeholder={i18n.t('Filter by role')}
                            selected={roleFilter}
                            onChange={({ selected }) => setRoleFilter(selected)}
                            clearable
                        >
                            {roles.map(role => (
                                <SingleSelectOption key={role} value={role} label={role} />
                            ))}
                        </SingleSelect>
                    </Box>
                    
                    <Box style={{ minWidth: '120px' }}>
                        <SingleSelect
                            placeholder={i18n.t('Filter by status')}
                            selected={statusFilter}
                            onChange={({ selected }) => setStatusFilter(selected)}
                            clearable
                        >
                            {statuses.map(status => (
                                <SingleSelectOption key={status} value={status} label={status} />
                            ))}
                        </SingleSelect>
                    </Box>
                </FilterBar>
                
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('User')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Role')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Last Login')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Assessments')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {filteredUsers.map(user => (
                            <DataTableRow key={user.id}>
                                <DataTableCell>
                                    <div>
                                        <strong>{user.firstName} {user.lastName}</strong>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            @{user.username} • {user.email}
                                        </div>
                                    </div>
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag neutral>{user.role}</Tag>
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag 
                                        positive={user.status === 'Active'} 
                                        neutral={user.status === 'Inactive'}
                                    >
                                        {user.status}
                                    </Tag>
                                </DataTableCell>
                                <DataTableCell>
                                    <span style={{ fontSize: '12px' }}>
                                        {new Date(user.lastLogin).toLocaleDateString()}
                                    </span>
                                </DataTableCell>
                                <DataTableCell>
                                    <strong>{user.assessments}</strong>
                                </DataTableCell>
                                <DataTableCell>
                                    <Box display="flex" gap="8px">
                                        <Button 
                                            small 
                                            secondary 
                                            onClick={() => handleEditUser(user.id)}
                                        >
                                            <IconEdit24 />
                                        </Button>
                                        <Button 
                                            small 
                                            secondary={user.status === 'Active'}
                                            primary={user.status === 'Inactive'}
                                            onClick={() => handleToggleUserStatus(user.id)}
                                        >
                                            {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button 
                                            small 
                                            destructive 
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            <IconDelete24 />
                                        </Button>
                                    </Box>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
                
                {filteredUsers.length === 0 && (
                    <Box 
                        display="flex" 
                        justifyContent="center" 
                        alignItems="center" 
                        style={{ padding: '40px', color: '#666' }}
                    >
                        {i18n.t('No users found matching the current filters')}
                    </Box>
                )}
            </SectionContainer>

            {/* User Roles & Permissions */}
            <SectionContainer>
                <SectionTitle>
                    <IconSettings24 />
                    {i18n.t('Roles & Permissions')}
                </SectionTitle>
                
                <NoticeBox title={i18n.t('Coming Soon')} info>
                    {i18n.t('Role and permission management interface will be available in a future update. This will allow you to create custom roles, assign specific permissions, and manage user access levels.')}
                </NoticeBox>
            </SectionContainer>
        </div>
    )
}