import React, { useState, useEffect } from 'react'
import { 
    Box,
    Button,
    ButtonStrip,
    Card,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    Field,
    Input,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    SingleSelect,
    SingleSelectOption,
    Switch,
    TextArea,
    IconAdd24,
    IconEdit24,
    IconDelete24,
    IconSettings24,
    Tag
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import styled from 'styled-components'

// Import individual channel configuration components
import { EmailChannelConfig } from './channels/EmailChannelConfig'
import { SMSChannelConfig } from './channels/SMSChannelConfig'
import { TelegramChannelConfig } from './channels/TelegramChannelConfig'
import { WebhookChannelConfig } from './channels/WebhookChannelConfig'
import { WhatsAppChannelConfig } from './channels/WhatsAppChannelConfig'

// Import icons utility
import { ChannelIcons, ProviderLogos, getChannelIcon, getProviderLogo } from '../../../utils/channelIcons'

const Container = styled.div`
    padding: 16px;
    max-width: 1200px;
`

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h2 {
        margin: 0;
        color: #212934;
        font-size: 20px;
        font-weight: 500;
    }
`

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
`

const StatCard = styled(Card)`
    padding: 16px;
    text-align: center;
    
    .stat-number {
        font-size: 24px;
        font-weight: bold;
        color: #1976d2;
        margin-bottom: 4px;
    }
    
    .stat-label {
        font-size: 14px;
        color: #6c757d;
    }
`

export const ChannelsProviders = () => {
    const [channels, setChannels] = useState([])
    const [providers, setProviders] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [activeTab, setActiveTab] = useState('channels')

    // Mock data - replace with actual API calls
    useEffect(() => {
        const mockChannels = [
            {
                id: '1',
                name: 'System Email',
                type: 'email',
                status: 'active',
                description: 'Primary email notifications',
                config: {
                    smtpServer: 'smtp.gmail.com',
                    smtpPort: '587',
                    username: 'system@example.com',
                    fromEmail: 'noreply@example.com',
                    fromName: 'DQA360 System',
                    useSSL: true
                },
                lastUsed: '2024-01-15T10:30:00Z',
                messagesSent: 1250
            },
            {
                id: '2',
                name: 'SMS Alerts',
                type: 'sms',
                status: 'active',
                description: 'Critical alerts via SMS',
                config: {
                    provider: 'twilio',
                    accountSid: 'AC***',
                    fromNumber: '+1234567890'
                },
                lastUsed: '2024-01-14T15:45:00Z',
                messagesSent: 89
            },
            {
                id: '3',
                name: 'Telegram Bot',
                type: 'telegram',
                status: 'inactive',
                description: 'Telegram notifications',
                config: {
                    botToken: '***',
                    defaultChatId: '@dqa360_alerts'
                },
                lastUsed: null,
                messagesSent: 0
            },
            {
                id: '4',
                name: 'WhatsApp Alerts',
                type: 'whatsapp',
                status: 'active',
                description: 'WhatsApp notifications via UltraMsg',
                config: {
                    provider: 'ultramsg',
                    instanceId: 'instance12345',
                    apiToken: '***',
                    defaultRecipient: '+1234567890',
                    enableDeliveryReports: true
                },
                lastUsed: '2024-01-16T08:15:00Z',
                messagesSent: 156
            }
        ]

        const mockProviders = [
            {
                id: '1',
                name: 'Gmail SMTP',
                type: 'email',
                status: 'active',
                description: 'Gmail SMTP service',
                channels: ['1']
            },
            {
                id: '2',
                name: 'Twilio SMS',
                type: 'sms',
                status: 'active',
                description: 'Twilio SMS service',
                channels: ['2']
            },
            {
                id: '3',
                name: 'UltraMsg WhatsApp',
                type: 'whatsapp',
                status: 'active',
                description: 'UltraMsg WhatsApp service (Free tier)',
                channels: ['4']
            },
            {
                id: '4',
                name: 'CallMeBot WhatsApp',
                type: 'whatsapp',
                status: 'inactive',
                description: 'CallMeBot free WhatsApp service',
                channels: []
            },
            {
                id: '5',
                name: 'Green-API WhatsApp',
                type: 'whatsapp',
                status: 'inactive',
                description: 'Green-API WhatsApp service (Free tier)',
                channels: []
            }
        ]

        setChannels(mockChannels)
        setProviders(mockProviders)
        setLoading(false)
    }, [])

    const openModal = (channel = null) => {
        setEditing(channel || {
            name: '',
            type: 'email',
            status: 'active',
            description: '',
            config: {}
        })
        setModalOpen(true)
    }

    const closeModal = () => {
        setModalOpen(false)
        setEditing(null)
    }

    const saveChannel = () => {
        if (editing.id) {
            // Update existing channel
            setChannels(prev => prev.map(ch => ch.id === editing.id ? editing : ch))
        } else {
            // Add new channel
            const newChannel = {
                ...editing,
                id: Date.now().toString(),
                lastUsed: null,
                messagesSent: 0
            }
            setChannels(prev => [...prev, newChannel])
        }
        closeModal()
    }

    const deleteChannel = (id) => {
        if (window.confirm(i18n.t('Are you sure you want to delete this channel?'))) {
            setChannels(prev => prev.filter(ch => ch.id !== id))
        }
    }

    const toggleChannelStatus = (id) => {
        setChannels(prev => prev.map(ch => 
            ch.id === id 
                ? { ...ch, status: ch.status === 'active' ? 'inactive' : 'active' }
                : ch
        ))
    }

    const getChannelTypeIcon = (type, size = 20) => {
        return getChannelIcon(type, size)
    }

    const getStatusColor = (status) => {
        return status === 'active' ? 'positive' : 'neutral'
    }

    const activeChannels = channels.filter(ch => ch.status === 'active').length
    const totalMessages = channels.reduce((sum, ch) => sum + ch.messagesSent, 0)

    if (loading) {
        return <div>{i18n.t('Loading...')}</div>
    }

    return (
        <Container>
            <SectionHeader>
                <h2>
                    <IconSettings24 />
                    {i18n.t('Notification Channels & Providers')}
                </h2>
                <Button primary icon={<IconAdd24 />} onClick={() => openModal()}>
                    {i18n.t('Add Channel')}
                </Button>
            </SectionHeader>

            <StatsGrid>
                <StatCard>
                    <div className="stat-number">{channels.length}</div>
                    <div className="stat-label">{i18n.t('Total Channels')}</div>
                </StatCard>
                <StatCard>
                    <div className="stat-number">{activeChannels}</div>
                    <div className="stat-label">{i18n.t('Active Channels')}</div>
                </StatCard>
                <StatCard>
                    <div className="stat-number">{totalMessages.toLocaleString()}</div>
                    <div className="stat-label">{i18n.t('Messages Sent')}</div>
                </StatCard>
                <StatCard>
                    <div className="stat-number">{providers.length}</div>
                    <div className="stat-label">{i18n.t('Providers')}</div>
                </StatCard>
            </StatsGrid>

            <Card>
                <DataTable>
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>{i18n.t('Channel')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Type')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Status')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Messages Sent')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Last Used')}</DataTableColumnHeader>
                            <DataTableColumnHeader>{i18n.t('Actions')}</DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {channels.map(channel => (
                            <DataTableRow key={channel.id}>
                                <DataTableCell>
                                    <Box>
                                        <strong>{channel.name}</strong>
                                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                            {channel.description}
                                        </div>
                                    </Box>
                                </DataTableCell>
                                <DataTableCell>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                                            {getChannelTypeIcon(channel.type, 20)}
                                        </div>
                                        {channel.type.toUpperCase()}
                                    </Box>
                                </DataTableCell>
                                <DataTableCell>
                                    <Tag positive={channel.status === 'active'} neutral={channel.status !== 'active'}>
                                        {channel.status.toUpperCase()}
                                    </Tag>
                                </DataTableCell>
                                <DataTableCell>{channel.messagesSent.toLocaleString()}</DataTableCell>
                                <DataTableCell>
                                    {channel.lastUsed 
                                        ? new Date(channel.lastUsed).toLocaleDateString()
                                        : i18n.t('Never')
                                    }
                                </DataTableCell>
                                <DataTableCell>
                                    <ButtonStrip>
                                        <Button 
                                            small 
                                            secondary 
                                            icon={<IconEdit24 />}
                                            onClick={() => openModal(channel)}
                                        >
                                            {i18n.t('Edit')}
                                        </Button>
                                        <Button 
                                            small 
                                            secondary
                                            onClick={() => toggleChannelStatus(channel.id)}
                                        >
                                            {channel.status === 'active' ? i18n.t('Disable') : i18n.t('Enable')}
                                        </Button>
                                        <Button 
                                            small 
                                            destructive 
                                            icon={<IconDelete24 />}
                                            onClick={() => deleteChannel(channel.id)}
                                        >
                                            {i18n.t('Delete')}
                                        </Button>
                                    </ButtonStrip>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </Card>

            {modalOpen && (
                <Modal large onClose={closeModal}>
                    <ModalTitle>
                        {editing?.id ? i18n.t('Edit Channel') : i18n.t('Add New Channel')}
                    </ModalTitle>
                    <ModalContent>
                        <Box>
                            <Box marginTop="16px">
                                <Field label={i18n.t('Channel Name')}>
                                    <Input 
                                        value={editing?.name || ''} 
                                        onChange={({ value }) => setEditing(s => ({ ...s, name: value }))} 
                                        placeholder={i18n.t('Enter channel name')}
                                    />
                                </Field>
                            </Box>

                            <Box marginTop="16px">
                                <Field label={i18n.t('Channel Type')}>
                                    <SingleSelect
                                        selected={editing?.type || 'email'}
                                        onChange={({ selected }) => setEditing(s => ({ ...s, type: selected, config: {} }))}
                                    >
                                        <SingleSelectOption label={i18n.t('Email')} value="email" />
                                        <SingleSelectOption label={i18n.t('SMS')} value="sms" />
                                        <SingleSelectOption label={i18n.t('Telegram')} value="telegram" />
                                        <SingleSelectOption label={i18n.t('WhatsApp')} value="whatsapp" />
                                        <SingleSelectOption label={i18n.t('Webhook')} value="webhook" />
                                    </SingleSelect>
                                </Field>
                            </Box>

                            <Box marginTop="16px">
                                <Field label={i18n.t('Description')}>
                                    <TextArea 
                                        value={editing?.description || ''} 
                                        onChange={({ value }) => setEditing(s => ({ ...s, description: value }))} 
                                        placeholder={i18n.t('Enter channel description')}
                                        rows={2}
                                    />
                                </Field>
                            </Box>

                            <Box marginTop="16px">
                                <Switch
                                    checked={editing?.status === 'active'}
                                    onChange={({ checked }) => setEditing(s => ({ ...s, status: checked ? 'active' : 'inactive' }))}
                                    label={i18n.t('Channel Active')}
                                />
                            </Box>

                            {/* Channel-specific configuration components */}
                            <EmailChannelConfig editing={editing} setEditing={setEditing} />
                            <SMSChannelConfig editing={editing} setEditing={setEditing} />
                            <TelegramChannelConfig editing={editing} setEditing={setEditing} />
                            <WhatsAppChannelConfig editing={editing} setEditing={setEditing} />
                            <WebhookChannelConfig editing={editing} setEditing={setEditing} />
                        </Box>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={closeModal}>
                                {i18n.t('Cancel')}
                            </Button>
                            <Button primary onClick={saveChannel}>
                                {editing?.id ? i18n.t('Update Channel') : i18n.t('Create Channel')}
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Container>
    )
}

export default ChannelsProviders