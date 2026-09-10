import { useEffect, useState } from 'react'

import { readRecentBoards, recentBoardsEventName, type RecentBoard } from '@/lib/recentBoards'

export function useRecentBoards(): RecentBoard[] {
  const [boards, setBoards] = useState(readRecentBoards)

  useEffect(() => {
    function sync() {
      setBoards(readRecentBoards())
    }
    window.addEventListener(recentBoardsEventName(), sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(recentBoardsEventName(), sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return boards
}
