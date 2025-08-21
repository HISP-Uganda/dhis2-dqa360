import React, { useEffect, useState } from 'react'
import {
    Box,
    Card,
    DataTable,
    DataTableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableBody,
    DataTableCell,
    Tag,
    Button,
    ButtonStrip,
    IconAdd16,
    IconEdit16,
    IconDelete16,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Input,
    SingleSelect,
    SingleSelectOption,
    Switch,
    NoticeBox,
    Divider
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useNotificationConfig } from '../../../services/notificationConfigService'

const TYPES = ['sms', 'email', 'whatsapp', 'telegram']
const ENVIRONMENTS = ['Prod', 'Test']

const StatusTag = ({ status }) => {
    if (status === 'success') return <Tag positive>{i18n.t('Healthy')}</Tag>
    if (status === 'failure') return <Tag negative>{i18n.t('Unhealthy')}</Tag>
    return <Tag>{i18n.t('Not tested')}</Tag>
}

export const ChannelsProviders = () => {
    const { loadProviders, upsertProvider, deleteProvider } = useNotificationConfig()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [providers, setProviders] = useState([])

    const [isModalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)

    const fetchProviders = async () => {
        setLoading(true)
        setError(null)
        try {
            const list = await loadProviders()
            setProviders(list)
        } catch (e) {
            setError(e?.message || 'Failed to load providers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProviders()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openCreate = () => {
        setEditing({
            id: undefined,
            name: '',
            type: 'sms',
            environment: 'Prod',
            enabled: true,
            lastTest: null,
            lastTestStatus: 'unknown',
            config: {}
        })
        setModalOpen(true)
    }

    const openEdit = (p) => {
        setEditing({ ...p })
        setModalOpen(true)
    }

    const closeModal = () => {
        setModalOpen(false)
        setEditing(null)
    }

    const handleSave = async () => {
        try {
            const payload = {
                ...editing,
                id: editing.id || `prov_${Date.now()}`,
            }
            await upsertProvider(payload)
            await fetchProviders()
            closeModal()
        } catch (e) {
            setError(e?.message || 'Failed to save provider')
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteProvider(id)
            await fetchProviders()
        } catch (e) {
            setError(e?.message || 'Failed to delete provider')
        }
    }

    const hasProviders = providers.length > 0

    return (
        <Box>
            <Box marginBottom="12px" display="flex" justifyContent="space-between" alignItems="center">
                <div>
                    <h2 style={{ margin: 0 }}>{i18n.t('Channels & Providers')}</h2>
                    <p style={{ margin: '4px 0 0 0' }}>{i18n.t('Configure SMS/Email/WhatsApp/Telegram providers and view health status')}</p>
                </div>
                <Button primary icon={<IconAdd16 />} onClick={openCreate}>{i18n.t('Add provider')}</Button>
            </Box>

            {error && (
                <Box marginBottom="8px">
                    <NoticeBox error title={i18n.t('Error')}>
                        {error}
                    </NoticeBox>
                </Box>
            )}

            <Card>
                <Box padding="12px">
                    {loading ? (
                        <p>{i18n.t('Loading...')}</p>
                    ) : !hasProviders ? (
                        <Box textAlign="center" padding="24px">
                            <p style={{ marginBottom: 12 }}>{i18n.t('No providers configured yet.')}</p>
                            <Button small onClick={openCreate} icon={<IconAdd16 />}>{i18n.t('Add your first provider')}</Button>
                        </Box>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>{i18n.t('Type')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Provider')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Environment')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Enabled')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Last Tested')}</DataTableColumnHeader>
                                    <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {providers.map((p) => (
                                    <DataTableRow key={p.id}>
                                        <DataTableCell>{p.type}</DataTableCell>
                                        <DataTableCell>{p.name}</DataTableCell>
                                        <DataTableCell>{p.environment || 'Prod'}</DataTableCell>
                                        <DataTableCell>{p.enabled ? i18n.t('Yes') : i18n.t('No')}</DataTableCell>
                                        <DataTableCell><StatusTag status={p.lastTest?.status || 'unknown'} /></DataTableCell>
                                        <DataTableCell>{p.lastTest?.at ? new Date(p.lastTest.at).toISOString().slice(0, 10) : '-'}</DataTableCell>
                                        <DataTableCell>
                                            <ButtonStrip>
                                                <Button small onClick={() => openEdit(p)} icon={<IconEdit16 />}>{i18n.t('Configure')}</Button>
                                                <Button small destructive onClick={() => handleDelete(p.id)} icon={<IconDelete16 />}>{i18n.t('Delete')}</Button>
                                            </ButtonStrip>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    )}
                </Box>
            </Card>

            {isModalOpen && (
                <Modal onClose={closeModal} position="middle">
                    <ModalTitle>{editing?.id ? i18n.t('Edit provider') : i18n.t('Add provider')}</ModalTitle>
                    <ModalContent>
                        <Box maxWidth="520px">
                            <Box marginBottom="8px">
                                <SingleSelect
                                    selected={editing.type}
                                    onChange={({ selected }) => setEditing((s) => ({ ...s, type: selected }))}
                                    placeholder={i18n.t('Select type')}
                                    label={i18n.t('Type')}
                                >
                                    {TYPES.map((t) => (
                                        <SingleSelectOption key={t} label={t} value={t} />
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box marginBottom="8px">
                                <Input
                                    value={editing.name}
                                    onChange={({ value }) => setEditing((s) => ({ ...s, name: value }))}
                                    placeholder={i18n.t('e.g., Twilio, SendGrid, Meta, Telegram Bot')}
                                    label={i18n.t('Provider name')}
                                />
                            </Box>
                            <Box marginBottom="8px">
                                <SingleSelect
                                    selected={editing.environment}
                                    onChange={({ selected }) => setEditing((s) => ({ ...s, environment: selected }))}
                                    placeholder={i18n.t('Select environment')}
                                    label={i18n.t('Environment')}
                                >
                                    {ENVIRONMENTS.map((e) => (
                                        <SingleSelectOption key={e} label={e} value={e} />
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box marginBottom="8px">
                                <Switch
                                    checked={!!editing.enabled}
                                    onChange={({ checked }) => setEditing((s) => ({ ...s, enabled: checked }))}
                                    label={i18n.t('Enabled')}
                                />
                            </Box>
                            <Divider />
                            <Box marginTop="8px">
                                <p style={{ marginTop: 0, color: '#6b7280' }}>
                                    {i18n.t('Provider-specific fields (API keys, secrets, etc.) can be added next.')}
                                </p>
                            </Box>
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={closeModal}>{i18n.t('Cancel')}</Button>
                            <Button primary onClick={handleSave}>{i18n.t('Save')}</Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Box>
    )
}

export default ChannelsProviders