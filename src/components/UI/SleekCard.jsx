import React from 'react'
import styled from 'styled-components'

const StyledCard = styled.div`
    background: #ffffff;
    padding: ${props => props.padding || '24px'};
    margin-bottom: ${props => props.marginBottom || '16px'};
    border: 1px solid #e0e0e0;
    
    ${props => props.interactive && `
        cursor: pointer;
    `}
    
    ${props => props.compact && `
        padding: 16px;
    `}
`

const CardHeader = styled.div`
    margin-bottom: ${props => props.marginBottom || '16px'};
    
    h1, h2, h3, h4, h5, h6 {
        margin: 0 0 8px 0;
        color: #212529;
        font-weight: 500;
    }
    
    p {
        margin: 0;
        color: #6c757d;
        line-height: 1.5;
    }
    
    ${props => props.centerAlign && `
        text-align: center;
    `}
`

const CardContent = styled.div`
    ${props => props.centerAlign && `
        text-align: center;
    `}
`

const CardActions = styled.div`
    margin-top: ${props => props.marginTop || '16px'};
    display: flex;
    gap: 8px;
    
    ${props => props.justify === 'center' && `
        justify-content: center;
    `}
    
    ${props => props.justify === 'end' && `
        justify-content: flex-end;
    `}
    
    ${props => props.justify === 'between' && `
        justify-content: space-between;
    `}
`

export const SleekCard = ({ 
    children, 
    padding, 
    marginBottom, 
    interactive, 
    compact, 
    elevated,
    onClick,
    ...props 
}) => {
    return (
        <StyledCard
            padding={padding}
            marginBottom={marginBottom}
            interactive={interactive}
            compact={compact}
            elevated={elevated}
            onClick={onClick}
            {...props}
        >
            {children}
        </StyledCard>
    )
}

SleekCard.Header = CardHeader
SleekCard.Content = CardContent
SleekCard.Actions = CardActions