import React, { useState } from 'react'
import { Button, SingleSelect, SingleSelectOption, Card, Box } from '@dhis2/ui'
import styled from 'styled-components'
import { isDemoMode, getDemoRole, setDemoRole, setDemoMode } from '../../utils/demoUserOverride'

const DemoControlsContainer = styled.div`
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 9999;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 250px;
    
    ${props => !props.visible && `
        transform: translateX(calc(100% + 20px));
        transition: transform 0.3s ease;
    `}
    
    ${props => props.visible && `
        transform: translateX(0);
        transition: transform 0.3s ease;
    `}
`

const ToggleButton = styled.button`
    position: fixed;
    top: 60px;
    right: ${props => props.expanded ? '270px' : '20px'};
    z-index: 10000;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 12px;
    transition: right 0.3s ease;
    
    &:hover {
        background: #1565c0;
    }
`

const Title = styled.h4`
    margin: 0 0 12px 0;
    color: #1976d2;
    font-size: 14px;
    font-weight: 600;
`

const Label = styled.label`
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #333;
`

const Status = styled.div`
    margin-top: 12px;
    padding: 8px;
    background: ${props => props.enabled ? '#e8f5e8' : '#fff3cd'};
    border: 1px solid ${props => props.enabled ? '#c3e6c3' : '#ffeaa7'};
    border-radius: 4px;
    font-size: 12px;
    color: ${props => props.enabled ? '#2d5a2d' : '#856404'};
`

export const DemoControls = () => {
    const [visible, setVisible] = useState(false)
    const [currentRole, setCurrentRole] = useState(getDemoRole())
    const [demoEnabled, setDemoEnabled] = useState(isDemoMode())

    const handleRoleChange = ({ selected }) => {
        setCurrentRole(selected)
        setDemoRole(selected)
        // Reload page to apply changes
        window.location.reload()
    }

    const handleDemoToggle = () => {
        const newState = !demoEnabled
        setDemoEnabled(newState)
        setDemoMode(newState)
        // Reload page to apply changes
        window.location.reload()
    }

    // Only show in development mode
    if (process.env.NODE_ENV === 'production') {
        return null
    }

    return (
        <>
            <ToggleButton 
                expanded={visible}
                onClick={() => setVisible(!visible)}
            >
                {visible ? '✕' : '🔧'} Demo
            </ToggleButton>
            
            <DemoControlsContainer visible={visible}>
                <Title>🔧 Demo Controls</Title>
                
                <div style={{ marginBottom: '12px' }}>
                    <Label>Demo Mode</Label>
                    <Button
                        small
                        secondary={!demoEnabled}
                        primary={demoEnabled}
                        onClick={handleDemoToggle}
                    >
                        {demoEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                </div>

                {demoEnabled && (
                    <div style={{ marginBottom: '12px' }}>
                        <Label>User Role</Label>
                        <SingleSelect
                            selected={currentRole}
                            onChange={handleRoleChange}
                            dense
                        >
                            <SingleSelectOption value="user" label="User (DQA360_USER)" />
                            <SingleSelectOption value="admin" label="Admin (DQA360_ADMIN)" />
                            <SingleSelectOption value="superuser" label="Superuser (ALL)" />
                        </SingleSelect>
                    </div>
                )}

                <Status enabled={demoEnabled}>
                    {demoEnabled ? (
                        <>
                            ✅ Demo mode active<br />
                            👤 Role: <strong>{currentRole}</strong><br />
                            🔑 Custom authorities enabled
                        </>
                    ) : (
                        <>
                            ⚠️ Demo mode disabled<br />
                            Using real DHIS2 authorities
                        </>
                    )}
                </Status>

                <div style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
                    💡 Changes require page reload
                </div>
            </DemoControlsContainer>
        </>
    )
}