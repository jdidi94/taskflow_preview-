import { configureStore } from '@reduxjs/toolkit'

import { analyticsApi } from '@/services/analyticsApi'
import { authApi } from '@/services/authApi'
import { boardsApi } from '@/services/boardsApi'
import { chatApi } from '@/services/chatApi'
import { checkoutApi } from '@/services/checkoutApi'
import { filesApi } from '@/services/filesApi'
import { githubApi } from '@/services/githubApi'
import { invitationsApi } from '@/services/invitationsApi'
import { notificationsApi } from '@/services/notificationsApi'
import { spacesApi } from '@/services/spacesApi'
import { tasksApi } from '@/services/tasksApi'
import { templatesApi } from '@/services/templatesApi'
import { workspacesApi } from '@/services/workspacesApi'
import { authReducer } from '@/store/slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [workspacesApi.reducerPath]: workspacesApi.reducer,
    [spacesApi.reducerPath]: spacesApi.reducer,
    [boardsApi.reducerPath]: boardsApi.reducer,
    [tasksApi.reducerPath]: tasksApi.reducer,
    [filesApi.reducerPath]: filesApi.reducer,
    [githubApi.reducerPath]: githubApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [invitationsApi.reducerPath]: invitationsApi.reducer,
    [checkoutApi.reducerPath]: checkoutApi.reducer,
    [templatesApi.reducerPath]: templatesApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      workspacesApi.middleware,
      spacesApi.middleware,
      boardsApi.middleware,
      tasksApi.middleware,
      filesApi.middleware,
      githubApi.middleware,
      notificationsApi.middleware,
      chatApi.middleware,
      invitationsApi.middleware,
      checkoutApi.middleware,
      templatesApi.middleware,
      analyticsApi.middleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
