import { app, type BrowserWindow } from 'electron'
import { unwrapWorkspaceResponse, type WorkspaceRequest } from '../../shared/connection'

export async function requestWorkspaceProof(window: BrowserWindow, request: WorkspaceRequest) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  return unwrapWorkspaceResponse(
    await window.webContents.executeJavaScript(
      `window.marketing.workspace(${JSON.stringify(request)})`,
    ),
  )
}
