import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

import { ChatComposer, ChatMessageList } from '@/components/chat/ChatThread'
import { useChatSocket } from '@/hooks/useChatSocket'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { panelVariants, reduced, snappySpring, softSpring } from '@/lib/motion'
import {
  getStoredChatId,
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
  useStartChatMutation,
} from '@/services/chatApi'
import { useAppSelector } from '@/store/hooks'
import type { ChatMessage } from '@/types/chat'

export function ChatFab() {
  const { t } = useI18n()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const user = useAppSelector((state) => state.auth.user)
  const [open, setOpen] = useState(false)
  const [chatId, setChatId] = useState<string | null>(() => getStoredChatId())
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const openRef = useRef(open)
  const userIdRef = useRef(user?.id)
  openRef.current = open
  userIdRef.current = user?.id

  const [startChat, { isLoading: starting }] = useStartChatMutation()
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation()
  const { data, isLoading } = useGetChatHistoryQuery(chatId ?? '', {
    skip: !chatId || !open,
  })

  const onSocketMessage = useCallback((message: ChatMessage) => {
    if (openRef.current) return
    const selfId = userIdRef.current
    const fromSelf = Boolean(selfId && message.sender?.id && message.sender.id === selfId)
    if (fromSelf) return
    setUnread((count) => count + 1)
  }, [])

  useChatSocket(chatId ?? undefined, { onMessage: onSocketMessage })

  const messages = data?.data.messages ?? []
  const showPulse = !open && unread > 0 && !reduceMotion
  const busy = starting || sending

  useEffect(() => {
    const stored = getStoredChatId()
    if (stored && stored !== chatId) setChatId(stored)
  }, [chatId])

  function toggleOpen() {
    setOpen((value) => {
      const next = !value
      if (next) setUnread(0)
      return next
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    setError(null)
    try {
      if (!chatId) {
        const result = await startChat({ message: draft.trim() }).unwrap()
        setChatId(result.data.chat.id)
      } else {
        await sendMessage({ chatId, content: draft.trim() }).unwrap()
      }
      setDraft('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.sendError')))
    }
  }

  if (location.pathname === '/chat') return null

  return (
    <>
      <motion.button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={
          open
            ? t('chat.closeFab')
            : unread > 0
              ? t('chat.openFabUnread', { count: unread })
              : t('chat.openFab')
        }
        animate={showPulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={
          showPulse
            ? { duration: 1.9, repeat: Infinity, ease: 'easeInOut' }
            : reduced(snappySpring, reduceMotion)
        }
        whileTap={{ scale: 0.96 }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 ? (
          <span
            className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold text-destructive ring-2 ring-primary"
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="chat-fab-panel"
            className="fixed bottom-20 end-5 z-40 flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl origin-bottom-right"
            variants={panelVariants}
            initial="initial"
            animate="in"
            exit="out"
            transition={reduced(softSpring, reduceMotion)}
          >
            <header className="shrink-0 border-b border-border/70 px-3 py-2">
              <p className="text-sm font-semibold">{t('chat.fabTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('chat.fabHint')}</p>
              <Link
                to="/chat"
                className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setOpen(false)}
              >
                {t('chat.openFull')}
              </Link>
            </header>

            <ChatMessageList
              messages={messages}
              selfId={user?.id}
              loading={Boolean(chatId && isLoading)}
              empty={
                !chatId ? (
                  <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
                ) : null
              }
              footer={
                error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null
              }
            />

            <ChatComposer
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={(event) => void onSubmit(event)}
              placeholder={chatId ? t('chat.messagePlaceholder') : t('chat.startPlaceholder')}
              submitLabel={t('common.send')}
              disabled={busy}
              className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
