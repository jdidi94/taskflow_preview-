import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { aiService } from '../services/ai.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

export const generateTaskSuggestions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { spaceGoal, spaceContext, boardType } = req.body as {
    spaceGoal: string
    spaceContext?: string
    boardType?: 'kanban' | 'list' | 'calendar' | 'timeline'
  }

  const suggestions = await aiService.generateTaskSuggestions({
    goal: spaceGoal,
    context: spaceContext,
    boardType,
  })

  res.json({
    success: true,
    data: {
      suggestions,
      goal: spaceGoal,
    },
  })
})

export const analyzeTaskRisks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const analysis = await aiService.analyzeTaskRisks({
    spaceId: req.params.spaceId ? param(req, 'spaceId') : undefined,
    boardId: req.params.boardId ? param(req, 'boardId') : undefined,
    userId: req.user!.sub,
  })

  res.json({
    success: true,
    data: { analysis },
  })
})

export const parseNaturalLanguage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { input, boardId } = req.body as { input: string; boardId?: string }
  const parsedTask = await aiService.parseNaturalLanguageTask({
    input,
    boardId,
    userId: req.user!.sub,
  })

  res.json({
    success: true,
    data: {
      parsedTask,
      originalInput: input,
    },
  })
})

export const generateSpaceTimeline = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { startDate, targetEndDate, priorities } = req.body as {
    startDate?: string
    targetEndDate?: string
    priorities?: Array<'low' | 'medium' | 'high' | 'critical'>
  }

  const timeline = await aiService.generateSpaceTimeline({
    spaceId: param(req, 'spaceId'),
    startDate: startDate ? new Date(startDate) : new Date(),
    targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
    priorities: priorities ?? [],
  })

  res.json({ success: true, data: { timeline } })
})

export const getSmartRecommendations = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req as any).validatedQuery ?? req.query
  const recommendations = await aiService.getSmartRecommendations({
    spaceId: param(req, 'spaceId'),
    type: (q as any).type,
    userId: req.user!.sub,
  })

  res.json({ success: true, data: { recommendations } })
})

export const analyzeTeamPerformance = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req as any).validatedQuery ?? req.query
  const performance = await aiService.analyzeTeamPerformance({
    spaceId: param(req, 'spaceId'),
    period: (q as any).period,
    userId: req.user!.sub,
  })

  res.json({ success: true, data: { performance } })
})

export const generateTaskDescription = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { title, spaceContext, taskType } = req.body as {
    title: string
    spaceContext?: string
    taskType?: string
  }

  const description = await aiService.generateTaskDescription({
    title,
    context: spaceContext,
    taskType,
  })

  res.json({ success: true, data: { description, title } })
})

