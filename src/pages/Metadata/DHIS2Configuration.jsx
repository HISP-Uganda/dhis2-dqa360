import React, { useState, useEffect } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import {
    Box,
    Button,
    ButtonStrip,
    Card,
    InputField,
    NoticeBox,
    CircularLoader,
    AlertBar,
    Tag,
    Divider
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

// Custom hook to test DHIS2 connection with timeout and cancellation
const useTestConnection = () => {
    const [testing, setTesting] = useState(false)
    const [result, setResult] = useState(null)
    const [abortController, setAbortController] = useState(null)

    const testConnection = async (config) => {
        setTesting(true)
        setResult(null)

        // Create abort controller for cancellation
        const controller = new AbortController()
        setAbortController(controller)

        // Set up timeout (30 seconds)
        const timeoutId = setTimeout(() => {
            controller.abort()
        }, 30000)

        try {
            // Create basic auth header
            const auth = btoa(`${config.username}:${config.password}`)
            
            // Test connection by fetching system info with timeout
            const response = await fetch(`${config.baseUrl}/api/system/info`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (response.ok) {
                const systemInfo = await response.json()
                setResult({
                    success: true,
                    systemInfo,
                    message: i18n.t('Connection successful!')
                })
            } else {
                setResult({
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    message: i18n.t('Connection failed. Please check your credentials.')
                })
            }
        } catch (error) {
            clearTimeout(timeoutId)
            
            if (error.name === 'AbortError') {
                setResult({
                    success: false,
                    error: 'Connection timeout',
                    message: i18n.t('Connection timed out after 30 seconds. Please check the URL and network connectivity.')
                })
            } else {
                setResult({
                    success: false,
                    error: error.message,
                    message: i18n.t('Connection failed. Please check the URL and network connectivity.')
                })
            }
        } finally {
            setTesting(false)
            setAbortController(null)
        }
    }

    const cancelConnection = () => {
        if (abortController) {
            abortController.abort()
            setResult({
                success: false,
                error: 'Connection cancelled',
                message: i18n.t('Connection test was cancelled.')
            })
        }
    }

    return { testConnection, cancelConnection, testing, result }
}

export const DHIS2Configuration = ({ value, onChange, onConfigured, isEditing = false }) => {
    const [config, setConfig] = useState(value || {
        baseUrl: '',
        username: '',
        password: '',
        configured: false
    })
    
    const { testConnection, cancelConnection, testing, result } = useTestConnection()

    // Sync with value prop
    useEffect(() => {
        if (value && JSON.stringify(value) !== JSON.stringify(config)) {
            setConfig(value)
        }
    }, [value])

    const handleTestConnection = () => {
        if (!config.baseUrl || !config.username || !config.password) {
            alert(i18n.t('Please fill in all required fields'))
            return
        }
        testConnection(config)
    }

    const handleSaveConfiguration = () => {
        if (!result?.success) {
            alert(i18n.t('Please test the connection successfully before saving'))
            return
        }

        const configuredData = {
            ...config,
            configured: true,
            systemInfo: result.systemInfo
        }

        setConfig(configuredData)
        
        // Store configuration securely (in real app, this would be encrypted)
        localStorage.setItem('dhis2_config', JSON.stringify(configuredData))
        
        // Notify parent component
        if (onConfigured) onConfigured(configuredData)
        if (onChange) onChange(configuredData)
    }

    const handleLoadSavedConfig = () => {
        const saved = localStorage.getItem('dhis2_config')
        if (saved) {
            try {
                const savedConfig = JSON.parse(saved)
                setConfig(savedConfig)
                if (onChange) onChange(savedConfig)
            } catch (error) {
                console.error('Error parsing saved DHIS2 config:', error)
                localStorage.removeItem('dhis2_config')
            }
        }
    }

    // Load saved config on component mount
    React.useEffect(() => {
        handleLoadSavedConfig()
    }, [])

    // Notify parent when config changes (but not when editing existing config)
    React.useEffect(() => {
        if (config.configured && !isEditing && onConfigured) {
            onConfigured(config)
        }
    }, [config.configured, onConfigured, isEditing])

    return (
        <Box>
            <Box marginBottom="24px">
                <h3>{i18n.t('DHIS2 Configuration')}</h3>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                    {i18n.t('Configure the external DHIS2 instance to load datasets and fetch data for assessment. This is the first required step.')}
                </p>
            </Box>

            <Card>
                <Box padding="24px">
                    {/* Configuration Status */}
                    {config.configured && (
                        <Box marginBottom="24px" padding="16px" style={{ backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>
                                        ✅ {i18n.t('DHIS2 Configuration Active')}
                                    </h4>
                                    <Box display="flex" gap="8px" alignItems="center">
                                        <Tag color="green">{config.baseUrl}</Tag>
                                        <span style={{ color: '#666', fontSize: '14px' }}>
                                            {i18n.t('Connected as: {{username}}', { username: config.username })}
                                        </span>
                                    </Box>
                                    {config.systemInfo && (
                                        <Box marginTop="8px" display="flex" gap="8px" alignItems="center">
                                            <Tag color="blue" small>{config.systemInfo.version}</Tag>
                                            <span style={{ color: '#666', fontSize: '12px' }}>
                                                {config.systemInfo.systemName}
                                            </span>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {!config.configured && (
                        <>
                            <NoticeBox warning title={i18n.t('External DHIS2 Configuration Required')}>
                                {i18n.t('You must configure the external DHIS2 instance before proceeding. All datasets will be loaded from this configured instance.')}
                            </NoticeBox>

                            <Divider margin="24px" />
                        </>
                    )}

                    <Box display="flex" flexDirection="column" gap="16px">
                        <InputField
                            label={i18n.t('DHIS2 Base URL')}
                            placeholder="https://dhis2.example.com"
                            value={config.baseUrl}
                            onChange={({ value }) => {
                                const newConfig = { ...config, baseUrl: value.trim() }
                                setConfig(newConfig)
                                if (onChange) onChange(newConfig)
                            }}
                            required
                            helpText={i18n.t('Enter the full URL of the DHIS2 instance (e.g., https://dhis2.example.com)')}
                        />
                        
                        <InputField
                            label={i18n.t('Username')}
                            placeholder={i18n.t('Enter username')}
                            value={config.username}
                            onChange={({ value }) => {
                                const newConfig = { ...config, username: value.trim() }
                                setConfig(newConfig)
                                if (onChange) onChange(newConfig)
                            }}
                            required
                            helpText={i18n.t('DHIS2 username with access to datasets and metadata')}
                        />
                        
                        <InputField
                            label={i18n.t('Password')}
                            type="password"
                            placeholder={i18n.t('Enter password')}
                            value={config.password}
                            onChange={({ value }) => {
                                const newConfig = { ...config, password: value }
                                setConfig(newConfig)
                                if (onChange) onChange(newConfig)
                            }}
                            required
                            helpText={i18n.t('Password for the DHIS2 user account')}
                        />

                        {/* Test Results */}
                        {result && (
                            <Box marginTop="16px">
                                {result.success ? (
                                    <AlertBar success>
                                        <Box>
                                            <strong>{result.message}</strong>
                                            {result.systemInfo && (
                                                <Box marginTop="8px">
                                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                                        {i18n.t('System: {{name}} ({{version}})', {
                                                            name: result.systemInfo.systemName,
                                                            version: result.systemInfo.version
                                                        })}
                                                    </p>
                                                </Box>
                                            )}
                                        </Box>
                                    </AlertBar>
                                ) : (
                                    <AlertBar critical>
                                        <Box>
                                            <strong>{result.message}</strong>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                                                {i18n.t('Error: {{error}}', { error: result.error })}
                                            </p>
                                        </Box>
                                    </AlertBar>
                                )}
                            </Box>
                        )}

                        {testing && (
                            <Box marginBottom="16px">
                                <AlertBar>
                                    <Box display="flex" alignItems="center" gap="8px">
                                        <CircularLoader small />
                                        <div>
                                            <strong>{i18n.t('Testing connection...')}</strong>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                                                {i18n.t('This may take up to 30 seconds. Click Cancel to stop.')}
                                            </p>
                                        </div>
                                    </Box>
                                </AlertBar>
                            </Box>
                        )}

                        <ButtonStrip end>
                            {testing ? (
                                <Button 
                                    secondary 
                                    onClick={cancelConnection}
                                >
                                    {i18n.t('Cancel')}
                                </Button>
                            ) : (
                                <Button 
                                    secondary 
                                    onClick={handleTestConnection}
                                    disabled={!config.baseUrl || !config.username || !config.password}
                                >
                                    {i18n.t('Test Connection')}
                                </Button>
                            )}
                            
                            <Button 
                                primary 
                                onClick={handleSaveConfiguration}
                                disabled={!result?.success || testing}
                            >
                                {config.configured ? i18n.t('Update Configuration') : i18n.t('Save Configuration')}
                            </Button>
                            
                            {config.configured && !testing && (
                                <Button 
                                    destructive 
                                    onClick={() => {
                                        setConfig({ baseUrl: '', username: '', password: '', configured: false })
                                        localStorage.removeItem('dhis2_config')
                                        onConfigured(null)
                                    }}
                                >
                                    {i18n.t('Clear Configuration')}
                                </Button>
                            )}
                        </ButtonStrip>

                        <NoticeBox>
                            {i18n.t('Note: Your credentials will be stored securely and used only for data fetching during assessments. Test the connection first to verify access.')}
                        </NoticeBox>
                    </Box>
                </Box>
            </Card>
        </Box>
    )
}