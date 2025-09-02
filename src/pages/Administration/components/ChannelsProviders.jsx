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
import { setNotificationProviders } from '../../../services/notificationService'
import { useCallback } from 'react'

const TYPES = ['sms', 'email', 'whatsapp', 'telegram']
const ENVIRONMENTS = ['Prod', 'Test']

const StatusTag = ({ status }) => {
    if (status === 'success') return <Tag positive>{i18n.t('Healthy')}</Tag>
    if (status === 'failure') return <Tag negative>{i18n.t('Unhealthy')}</Tag>
    return <Tag>{i18n.t('Not tested')}</Tag>
}

export const ChannelsProviders = () => {
    const { loadProviders, upsertProvider, deleteProvider, toggleProvider, testProvider } = useNotificationConfig()

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
            setNotificationProviders(list)
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
            setNotificationProviders(providers)
            closeModal()
        } catch (e) {
            setError(e?.message || 'Failed to save provider')
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteProvider(id)
            await fetchProviders()
            setNotificationProviders(providers)
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
                                        <DataTableCell>
                                            <Switch
                                                checked={!!p.enabled}
                                                onChange={async ({ checked }) => { await toggleProvider(p.id, checked); await fetchProviders() }}
                                                dense
                                            />
                                        </DataTableCell>
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
                <Modal large position="top" onClose={closeModal} style={{ width: '90vw', maxWidth: 1000 }}>
                    <ModalTitle>{editing?.id ? i18n.t('Edit provider') : i18n.t('Add provider')}</ModalTitle>
                    <ModalContent>
                        <Box>
                            {/* General settings */}
                            <Box marginBottom="12px" display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Box>
                                    <SingleSelect
                                        selected={editing.type}
                                        onChange={({ selected }) => setEditing((s) => ({ ...s, type: selected, config: {} }))}
                                        placeholder={i18n.t('Select type')}
                                        label={i18n.t('Type')}
                                    >
                                        {TYPES.map((t) => (
                                            <SingleSelectOption key={t} label={t.toUpperCase()} value={t} />
                                        ))}
                                    </SingleSelect>
                                </Box>
                                <Box>
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
                                <Box>
                                    <Input
                                        value={editing.name}
                                        onChange={({ value }) => setEditing((s) => ({ ...s, name: value }))}
                                        placeholder={i18n.t('e.g., Twilio, SendGrid, Meta, Telegram Bot')}
                                        label={i18n.t('Provider name')}
                                    />
                                </Box>
                                <Box>
                                    <Switch
                                        checked={!!editing.enabled}
                                        onChange={({ checked }) => setEditing((s) => ({ ...s, enabled: checked }))}
                                        label={i18n.t('Enabled')}
                                    />
                                </Box>
                            </Box>

                            <Divider />

                            {/* Provider-specific configuration */}
                            <Box marginTop="12px">
                                {editing?.type === 'sms' && (
                                    <Box>
                                        <h3 style={{ marginTop: 0 }}>{i18n.t('SMS configuration')}</h3>
                                        <Box marginBottom="8px">
                                            <Switch
                                                checked={!!editing?.config?.useDhis2Gateway}
                                                onChange={({ checked }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), useDhis2Gateway: checked } }))}
                                                label={i18n.t('Use DHIS2 built-in SMS Gateway')}
                                            />
                                        </Box>
                                        {!editing?.config?.useDhis2Gateway && (
                                            <>
                                                <Box marginBottom="8px">
                                                    <SingleSelect
                                                        selected={editing?.config?.provider || 'generic'}
                                                        onChange={({ selected }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), provider: selected } }))}
                                                        label={i18n.t('Provider')}
                                                    >
                                                        <SingleSelectOption value="generic" label={i18n.t('Generic HTTP')} />
                                                        <SingleSelectOption value="twilio" label="Twilio" />
                                                        <SingleSelectOption value="vonage" label="Vonage (Nexmo)" />
                                                        <SingleSelectOption value="africastalking" label="Africa's Talking" />
                                                    </SingleSelect>
                                                </Box>

                                                {/* Generic HTTP */}
                                                {(!editing?.config?.provider || editing?.config?.provider === 'generic') && (
                                                    <Box marginTop="16px">
                                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                            <Box>
                                                                <Input label={i18n.t('Base URL (required)')} value={editing?.config?.baseUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), baseUrl: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <SingleSelect selected={editing?.config?.httpMethod || 'POST'} onChange={({ selected }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), httpMethod: selected } }))} label={i18n.t('HTTP Method')}>
                                                                    <SingleSelectOption value="POST" label="POST" />
                                                                    <SingleSelectOption value="GET" label="GET" />
                                                                </SingleSelect>
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Endpoint Path (optional)')} value={editing?.config?.endpointPath || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), endpointPath: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('From (Sender ID/Number) (required)')} value={editing?.config?.from || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), from: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('To Parameter Name (required)')} value={editing?.config?.toParam || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), toParam: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Message Parameter Name (required)')} value={editing?.config?.messageParam || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), messageParam: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('API Key (optional)')} value={editing?.config?.apiKey || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiKey: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('API Secret (optional)')} value={editing?.config?.apiSecret || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiSecret: value } }))} />
                                                            </Box>
                                                            <Box style={{ gridColumn: '1 / -1' }}>
                                                                <Input label={i18n.t('Additional Headers (JSON) (optional)')} value={editing?.config?.headersJson || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), headersJson: value } }))} />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Twilio */}
                                                {editing?.config?.provider === 'twilio' && (
                                                    <Box marginTop="16px">
                                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                            <Box>
                                                                <Input label={i18n.t('Account SID (required)')} value={editing?.config?.accountSid || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), accountSid: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Auth Token (required)')} value={editing?.config?.authToken || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), authToken: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('From (Sender Number) (required)')} value={editing?.config?.from || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), from: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Messaging Service SID (optional)')} value={editing?.config?.messagingServiceSid || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), messagingServiceSid: value } }))} />
                                                            </Box>
                                                            <Box style={{ gridColumn: '1 / -1' }}>
                                                                <Input label={i18n.t('Base URL (optional)')} value={editing?.config?.baseUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), baseUrl: value } }))} />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Vonage */}
                                                {editing?.config?.provider === 'vonage' && (
                                                    <Box marginTop="16px">
                                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                            <Box>
                                                                <Input label={i18n.t('API Key (required)')} value={editing?.config?.apiKey || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiKey: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('API Secret (required)')} value={editing?.config?.apiSecret || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiSecret: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('From (Sender ID/Number) (required)')} value={editing?.config?.from || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), from: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Base URL (optional)')} value={editing?.config?.baseUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), baseUrl: value } }))} />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Africa's Talking */}
                                                {editing?.config?.provider === 'africastalking' && (
                                                    <Box marginTop="16px">
                                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                            <Box>
                                                                <Input label={i18n.t('API Key (required)')} value={editing?.config?.apiKey || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiKey: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Username (required)')} value={editing?.config?.username || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), username: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('From (Sender ID/Shortcode) (optional)')} value={editing?.config?.from || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), from: value } }))} />
                                                            </Box>
                                                            <Box>
                                                                <Input label={i18n.t('Base URL (optional)')} value={editing?.config?.baseUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), baseUrl: value } }))} />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                )}

                                {editing?.type === 'email' && (
                                    <Box>
                                        <h3 style={{ marginTop: 0 }}>{i18n.t('Email configuration')}</h3>
                                        <Box marginBottom="8px">
                                            <Switch
                                                checked={!!editing?.config?.useDhis2Email}
                                                onChange={({ checked }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), useDhis2Email: checked } }))}
                                                label={i18n.t('Use DHIS2 SMTP settings')}
                                            />
                                        </Box>
                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                            <Box>
                                                <Input label={i18n.t('From Email (required)')} value={editing?.config?.from || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), from: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('From Name (optional)')} value={editing?.config?.fromName || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), fromName: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Reply-To (optional)')} value={editing?.config?.replyTo || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), replyTo: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Default Subject (optional)')} value={editing?.config?.defaultSubject || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), defaultSubject: value } }))} />
                                            </Box>
                                        </Box>
                                        {!editing?.config?.useDhis2Email && (
                                            <>
                                                <Divider />
                                                <h4>{i18n.t('SMTP settings')}</h4>
                                                <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                    <Box>
                                                        <Input label={i18n.t('SMTP Host (required)')} value={editing?.config?.smtpHost || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), smtpHost: value } }))} />
                                                    </Box>
                                                    <Box>
                                                        <Input label={i18n.t('SMTP Port (required)')} value={editing?.config?.smtpPort || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), smtpPort: value } }))} />
                                                    </Box>
                                                    <Box>
                                                        <Switch label={i18n.t('Use TLS/SSL')} checked={!!editing?.config?.smtpSecure} onChange={({ checked }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), smtpSecure: checked } }))} />
                                                    </Box>
                                                    <Box />
                                                    <Box>
                                                        <Input label={i18n.t('SMTP User (required)')} value={editing?.config?.smtpUser || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), smtpUser: value } }))} />
                                                    </Box>
                                                    <Box>
                                                        <Input label={i18n.t('SMTP Password (required)')} value={editing?.config?.smtpPass || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), smtpPass: value } }))} />
                                                    </Box>
                                                </Box>
                                                <Divider />
                                                <h4>{i18n.t('API (alternative)')}</h4>
                                                <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                    <Box>
                                                        <Input label={i18n.t('API Key (e.g., SendGrid) (optional)')} value={editing?.config?.apiKey || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiKey: value } }))} />
                                                    </Box>
                                                </Box>
                                            </>
                                        )}
                                                <Divider />
                                                <h4>{i18n.t('Defaults (optional)')}</h4>
                                                <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                                    <Box>
                                                        <Input label={i18n.t('Signature (optional)')} value={editing?.config?.signature || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), signature: value } }))} />
                                                    </Box>
                                                </Box>
                                    </Box>
                                )}

                                {editing?.type === 'whatsapp' && (
                                    <Box>
                                        <h3 style={{ marginTop: 0 }}>{i18n.t('WhatsApp (Cloud API)')}</h3>
                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', rowGap: '20px' }}>
                                            <Box>
                                                <Input label={i18n.t('Phone Number ID (required)')} value={editing?.config?.phoneNumberId || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), phoneNumberId: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Access Token (required)')} value={editing?.config?.accessToken || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), accessToken: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Business Account ID (optional)')} value={editing?.config?.businessAccountId || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), businessAccountId: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('API Version (optional)')} value={editing?.config?.apiVersion || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiVersion: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Default Recipient (optional)')} value={editing?.config?.defaultRecipient || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), defaultRecipient: value } }))} />
                                            </Box>
                                            <Box>
                                                <Input label={i18n.t('Template Namespace (optional)')} value={editing?.config?.templateNamespace || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), templateNamespace: value } }))} />
                                            </Box>
                                        </Box>
                                    </Box>
                                )}

                                {editing?.type === 'telegram' && (
                                    <Box>
                                        <h3 style={{ marginTop: 0 }}>{i18n.t('Telegram')}</h3>
                                        <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <Input label={i18n.t('Bot Token (required)')} value={editing?.config?.botToken || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), botToken: value } }))} />
                                            <Input label={i18n.t('Default Chat ID (required)')} value={editing?.config?.defaultChatId || editing?.config?.chatId || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), defaultChatId: value, chatId: value } }))} />
                                            <Input label={i18n.t('Proxy URL (optional)')} value={editing?.config?.proxyUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), proxyUrl: value } }))} />
                                            <Input label={i18n.t('API Base URL (optional)')} value={editing?.config?.apiBaseUrl || ''} onChange={({ value }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), apiBaseUrl: value } }))} />
                                            <Switch label={i18n.t('Allow dynamic Chat IDs')} checked={!!editing?.config?.allowDynamicChatIds} onChange={({ checked }) => setEditing((s) => ({ ...s, config: { ...(s.config || {}), allowDynamicChatIds: checked } }))} />
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={closeModal}>{i18n.t('Cancel')}</Button>
                            <Button onClick={async () => {
                                try {
                                    const tested = await testProvider(editing)
                                    const payload = { ...editing, lastTest: tested }
                                    await upsertProvider({ ...payload, id: editing.id || `prov_${Date.now()}` })
                                    await fetchProviders()
                                    setNotificationProviders(providers)
                                    setEditing(payload)
                                } catch (e) {
                                    setError(e?.message || 'Test failed')
                                }
                            }}>{i18n.t('Test & Save Status')}</Button>
                            <Button primary onClick={handleSave}>{i18n.t('Save')}</Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Box>
    )
}

export default ChannelsProviders