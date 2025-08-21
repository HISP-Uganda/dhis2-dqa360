import React from 'react'
import styled from 'styled-components'
import i18n from '@dhis2/d2-i18n'

const PageHeaderContainer = styled.div`
    background: white;
    border-bottom: 1px solid #e1e5e9;
    padding: 12px 0;
    margin-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`

const PageHeaderContent = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 12px;
    
    @media (max-width: 768px) {
        padding: 0 8px;
    }
`

const PageTitle = styled.h1`
    margin: 0 0 4px 0;
    color: #212529;
    font-size: 22px;
    font-weight: 500;
    line-height: 1.2;
    
    @media (max-width: 768px) {
        font-size: 20px;
    }
`

const PageDescription = styled.p`
    margin: 0;
    color: #6c757d;
    font-size: 14px;
    line-height: 1.3;
    
    @media (max-width: 768px) {
        font-size: 13px;
    }
`

const Breadcrumb = styled.div`
    margin-bottom: 8px;
    font-size: 13px;
    color: #6c757d;
    
    a {
        color: #1976d2;
        text-decoration: none;
        
        &:hover {
            text-decoration: underline;
        }
    }
    
    span {
        margin: 0 8px;
        color: #dee2e6;
    }
`

export const PageHeader = ({ 
    title, 
    description, 
    breadcrumbs = [],
    children 
}) => {
    return (
        <PageHeaderContainer>
            <PageHeaderContent>
                {breadcrumbs.length > 0 && (
                    <Breadcrumb>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                {crumb.href ? (
                                    <a href={crumb.href}>{crumb.label}</a>
                                ) : (
                                    <span style={{ color: '#212529' }}>{crumb.label}</span>
                                )}
                                {index < breadcrumbs.length - 1 && <span>/</span>}
                            </React.Fragment>
                        ))}
                    </Breadcrumb>
                )}
                
                <PageTitle>{title}</PageTitle>
                
                {description && (
                    <PageDescription>{description}</PageDescription>
                )}
                
                {children}
            </PageHeaderContent>
        </PageHeaderContainer>
    )
}