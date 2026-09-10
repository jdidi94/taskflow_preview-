import { configureStore } from '@reduxjs/toolkit'

import { adminActivityApi } from '@/services/adminActivityApi'
import { adminAiTokensApi } from '@/services/adminAiTokensApi'
import { adminAnalyticsApi } from '@/services/adminAnalyticsApi'
import { adminAuthApi } from '@/services/adminAuthApi'
import { adminChatApi } from '@/services/adminChatApi'
import { adminQuotasApi } from '@/services/adminQuotasApi'
import { adminTemplatesApi } from '@/services/adminTemplatesApi'
import { adminUsersApi } from '@/services/adminUsersApi'
import { authReducer } from '@/store/slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [adminAuthApi.reducerPath]: adminAuthApi.reducer,
    [adminUsersApi.reducerPath]: adminUsersApi.reducer,
    [adminAnalyticsApi.reducerPath]: adminAnalyticsApi.reducer,
    [adminTemplatesApi.reducerPath]: adminTemplatesApi.reducer,
    [adminAiTokensApi.reducerPath]: adminAiTokensApi.reducer,
    [adminQuotasApi.reducerPath]: adminQuotasApi.reducer,
    [adminChatApi.reducerPath]: adminChatApi.reducer,
    [adminActivityApi.reducerPath]: adminActivityApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      adminAuthApi.middleware,
      adminUsersApi.middleware,
      adminAnalyticsApi.middleware,
      adminTemplatesApi.middleware,
      adminAiTokensApi.middleware,
      adminQuotasApi.middleware,
      adminChatApi.middleware,
      adminActivityApi.middleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
