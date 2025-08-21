// src/D2App/pages/ManageAssessments/AssessmentSteps/ConnectionStep.jsx
import React, { useEffect, useMemo, useState } from 'react'
import {
    Button,
    ButtonStrip,
    InputField,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Checkbox,
    Tag,
    Help
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

/** utils */
const trim = (s) => (s || '').trim()
const trimSlash = (u) => trim(u).replace(/\/+$/, '')
const isValidHttpUrl = (value) => {
    if (!value || typeof value !== 'string') return false
    try {
        const u = new URL(value.trim())
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}
const toApiBase = (baseUrl, apiVersion) => {
    const root = trimSlash(baseUrl || '')
    const v = trim(String(apiVersion ?? ''))
    const versionPart = v ? `/v${v.replace(/^v/i, '')}` : ''
    return `${root}/api${versionPart}`
}
const base64 = (s) => {
    try {
        // browsers
        return btoa(unescape(encodeURIComponent(s)))
    } catch {
        // fallback node-ish env
        return Buffer.from(s, 'utf8').toString('base64')
    }
}

/**
 * Props:
 *  - dhis2Config: {
 *      baseUrl, authType: 'basic'|'token',
 *      username, password, token, apiVersion,
 *      connectionStatus, version, lastTested
 *    }
 *  - setDhis2Config: fn(updater)
 *  - onSaveConnection?: fn() (optional callback when connection is saved)
 */
const ConnectionStep = ({ dhis2Config, setDhis2Config, onSaveConnection }) => {
    // ensure parent has a config object
    useEffect(() => {
        if (!dhis2Config && typeof setDhis2Config === 'function') {
            setDhis2Config({
                baseUrl: '',
                authType: 'basic',
                username: '',
                password: '',
                token: '',
                apiVersion: '',
                connectionStatus: 'not_tested',
                version: '',
                lastTested: null
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const cfg = dhis2Config || {}
    const [testing, setTesting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [showPw, setShowPw] = useState(false)
    const [showToken, setShowToken] = useState(false)

    const canTest = useMemo(() => {
        if (!isValidHttpUrl(cfg.baseUrl)) return false
        const authType = (cfg.authType || 'basic').toLowerCase()
        if (authType === 'token') {
            return !!trim(cfg.token)
        }
        return !!trim(cfg.username) && !!trim(cfg.password)
    }, [cfg.baseUrl, cfg.authType, cfg.username, cfg.password, cfg.token])

    const update = (patch) => {
        if (typeof setDhis2Config === 'function') {
            setDhis2Config(prev => ({ ...(prev || {}), ...patch }))
        }
    }

    const onChange = (field) => ({ value }) => update({ [field]: value })
    const onToggleAuth = (selected) => update({ authType: selected || 'basic' })

    /** Build headers set based on auth */
    const buildHeaderCandidates = () => {
        const headers = []
        const common = { 'Accept': 'application/json' }

        if ((cfg.authType || 'basic').toLowerCase() === 'token') {
            const tok = trim(cfg.token)
            if (tok) {
                headers.push({ ...common, 'Authorization': `ApiToken ${tok}` })
                headers.push({ ...common, 'Authorization': `Bearer ${tok}` })
                headers.push({ ...common, 'Api-Token': tok }) // legacy/fallback
            }
        } else {
            const u = trim(cfg.username)
            const p = trim(cfg.password)
            if (u || p) headers.push({ ...common, 'Authorization': `Basic ${base64(`${u}:${p}`)}` })
        }
        return headers
    }

    const testConnection = async () => {
        setTesting(true)
        setError(null)
        const apiBase = toApiBase(cfg.baseUrl, cfg.apiVersion)
        const headerVariations = buildHeaderCandidates()

        const tryFetch = async (path, headers) => {
            const res = await fetch(`${apiBase}${path}`, {
                method: 'GET',
                headers,
                // never send cookies to foreign DHIS2
                credentials: 'omit',
            })
            let json = null
            try { json = await res.json() } catch (_) { /* ignore */ }
            return { ok: res.ok, status: res.status, json }
        }

        try {
            let success = null
            let caughtError = null
            // try all header variants
            for (const headers of headerVariations) {
                // 1) /me
                let r = await tryFetch('/me', headers)
                if (r.ok) { success = { endpoint: 'me', json: r.json }; break }
                // 2) /system/info (public on many servers)
                r = await tryFetch('/system/info', headers)
                if (r.ok) { success = { endpoint: 'system/info', json: r.json }; break }
                // keep latest failure
                caughtError = r
            }

            if (!success) {
                const status = caughtError?.status
                const msg = status === 401
                    ? i18n.t('Unauthorized: check credentials or token.')
                    : status === 403
                        ? i18n.t('Forbidden: your account does not have access.')
                        : i18n.t('Unable to connect. Verify the URL and credentials.')
                update({
                    connectionStatus: 'failed',
                    lastTested: new Date().toISOString()
                })
                setError(msg)
                setTesting(false)
                return
            }

            // parse version information
            const info = success.json || {}
            const version =
                info.version || info.dhis2Version || info.displayName || ''
            const userName = info.name || info.displayName || info.username || ''

            update({
                connectionStatus: 'ok',
                version,
                apiVersion: trim(cfg.apiVersion || ''), // keep user's choice
                lastTested: new Date().toISOString()
            })
        } catch (e) {
            setError(e?.message || i18n.t('Unexpected error while testing connection'))
            update({ connectionStatus: 'failed', lastTested: new Date().toISOString() })
        } finally {
            setTesting(false)
        }
    }

    const saveConnection = async () => {
        if (!canTest) return
        setSaving(true)
        setError(null)
        try {
            // Just save the credentials without testing
            // Mark as 'configured' to indicate credentials are saved but not tested
            update({
                connectionStatus: 'configured',
                lastTested: null
            })
            
            // Call the save callback
            if (typeof onSaveConnection === 'function') {
                await onSaveConnection()
            }
        } catch (e) {
            setError(e?.message || i18n.t('Failed to save connection'))
        } finally {
            setSaving(false)
        }
    }

    const statusChip = (() => {
        const s = (cfg.connectionStatus || 'not_tested').toLowerCase()
        if (s === 'ok') return <Tag positive>{i18n.t('Connected')}</Tag>
        if (s === 'configured') return <Tag neutral>{i18n.t('Configured')}</Tag>
        if (s === 'failed') return <Tag negative>{i18n.t('Failed')}</Tag>
        return <Tag neutral>{i18n.t('Not configured')}</Tag>
    })()

    return (
        <div style={{ padding: 16, maxWidth: 760 }}>
            <h3 style={{ margin: '0 0 8px 0' }}>{i18n.t('DHIS2 Connection')}</h3>
            <div style={{ marginBottom: 12, opacity: 0.8, fontSize: 13 }}>
                {i18n.t('Provide connection details to the external DHIS2 instance.')}
            </div>

            {error && (
                <NoticeBox error title={i18n.t('Connection error')} style={{ marginBottom: 16 }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
                </NoticeBox>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <InputField
                    label={i18n.t('Base URL')}
                    placeholder="https://demo.dhis2.org/e2"
                    value={cfg.baseUrl || ''}
                    onChange={onChange('baseUrl')}
                    helpText={i18n.t('Full URL to the DHIS2 server (no trailing slash needed).')}
                    error={!!cfg.baseUrl && !isValidHttpUrl(cfg.baseUrl)}
                    validationText={
                        !!cfg.baseUrl && !isValidHttpUrl(cfg.baseUrl) ? i18n.t('Enter a valid http(s) URL') : ''
                    }
                    required
                />

                <SingleSelectField
                    label={i18n.t('Authentication')}
                    selected={(cfg.authType || 'basic')}
                    onChange={({ selected }) => onToggleAuth(selected)}
                    helpText={i18n.t('Choose how to authenticate to the DHIS2 API.')}
                >
                    <SingleSelectOption value="basic" label={i18n.t('Username & Password')} />
                    <SingleSelectOption value="token" label={i18n.t('Personal Access Token')} />
                </SingleSelectField>

                {(cfg.authType || 'basic') === 'token' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                        <InputField
                            label={i18n.t('Personal Access Token')}
                            type={showToken ? 'text' : 'password'}
                            value={cfg.token || ''}
                            onChange={onChange('token')}
                            required
                            helpText={i18n.t('From your DHIS2 profile → Personal Access Tokens')}
                        />
                        <Checkbox
                            dense
                            checked={showToken}
                            onChange={({ checked }) => setShowToken(checked)}
                            label={i18n.t('Show')}
                        />
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <InputField
                                label={i18n.t('Username')}
                                value={cfg.username || ''}
                                onChange={onChange('username')}
                                required
                            />
                            <InputField
                                label={i18n.t('Password')}
                                type={showPw ? 'text' : 'password'}
                                value={cfg.password || ''}
                                onChange={onChange('password')}
                                required
                            />
                        </div>
                        <div>
                            <Checkbox
                                dense
                                checked={showPw}
                                onChange={({ checked }) => setShowPw(checked)}
                                label={i18n.t('Show password')}
                            />
                        </div>
                    </>
                )}

                <InputField
                    label={i18n.t('API version (optional)')}
                    placeholder={i18n.t('e.g. 40')}
                    value={cfg.apiVersion ?? ''}
                    onChange={({ value }) => {
                        const v = String(value || '').replace(/[^0-9]/g, '')
                        update({ apiVersion: v })
                    }}
                    helpText={i18n.t('When provided, requests will use /api/v{version}. Leave blank to use server default.')}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <ButtonStrip>
                    <Button secondary onClick={testConnection} disabled={!canTest || testing || saving}>
                        {testing ? i18n.t('Testing…') : i18n.t('Test connection')}
                    </Button>
                    <Button primary onClick={saveConnection} disabled={!canTest || testing || saving}>
                        {saving ? i18n.t('Saving…') : i18n.t('Save credentials')}
                    </Button>
                </ButtonStrip>
                <div>{statusChip}</div>
                {cfg.version ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {i18n.t('Server version')}: <strong>{cfg.version}</strong>
                    </div>
                ) : null}
                {cfg.lastTested ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {i18n.t('Last tested')}: {new Date(cfg.lastTested).toLocaleString()}
                    </div>
                ) : null}
            </div>

            <div style={{ marginTop: 16 }}>
                <Help>
                    {i18n.t(
                        'Test the connection to verify it works before proceeding to the next step. The connection status must show "Connected" to load datasets in step 3.'
                    )}
                </Help>
            </div>
        </div>
    )
}

export default ConnectionStep