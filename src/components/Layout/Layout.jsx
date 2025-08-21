import React from 'react'
import { Box } from '@dhis2/ui'
import { TopNavigation } from './TopNavigation'
import { usePageContext } from '../../contexts/PageContext'

import styled from 'styled-components'

const LayoutContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f8f9fa;
    position: relative;
`

const DHIS2HeaderSpacer = styled.div`
    height: 48px;
    
    @media (max-width: 768px) {
        height: 44px;
    }
`

const ContentArea = styled.div`
    flex: 1;
    overflow-y: auto;
    margin-top: 0px;
    
    @media (max-width: 768px) {
        margin-top: 0px;
    }
`

const MainContent = styled.div`
    padding: 0 4px 8px 4px;
    
    @media (max-width: 768px) {
        padding: 0 2px 8px 2px;
    }
`

export const Layout = ({ children }) => {
    const { pageInfo } = usePageContext()
    
    return (
        <LayoutContainer>
            <DHIS2HeaderSpacer />
            <TopNavigation />
            <ContentArea>
                <MainContent>
                    {children}
                </MainContent>
            </ContentArea>
        </LayoutContainer>
    )
}