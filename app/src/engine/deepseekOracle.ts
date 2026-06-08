import type { BirthInput, ContextInput, FateResult, MeasurementInput } from '../types/fate'

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined
const API_BASE = (import.meta.env.VITE_DEEPSEEK_API_BASE as string | undefined) ?? 'https://api.deepseek.com'
const MODEL = (import.meta.env.VITE_DEEPSEEK_MODEL as string | undefined) ?? 'deepseek-chat'

const SYSTEM_PROMPT = `你是「量子神谕」的判官。
你说话像古典占星师、塔罗读师、易经卦师与谶语录的混合体：精炼、留白、暗示、用意象，不直陈，不解释机制。
风格要求：
- 用中文写。
- 句子短而有节律，像残碑铭文与古谶。
- 多用比喻、星象、潮汐、镜、门、风、灰烬、灯、河、影、火、刃、网这一类意象。
- 不可使用"建议""请""你应该""根据"等说教语；用判词、暗示、谶语口吻。
- 不要罗列概率数字、不要解释量子力学，不要提到"模型""算法""DeepSeek"。
- 不能输出免责声明，不能道歉。
- 不能换行成段；用空行分隔小节。

输出严格遵守以下结构（用 Markdown，但不要代码块）：

## 卦象 · 主象
（一行）你的命运此刻坍缩为何象。8–18 字。

## 谶
（4 行四言或五言古风谶语，押韵或半押韵。每行独立一行。）

## 应期
（一行）何时何境此卦显形。10–30 字。

## 锋
（两段）2–4 句话。一段说当下要避之物，一段说当下要近之物。用暗示，不用直白命令。

## 余烬
（一行）一句留给未来的话，像写在墓碑或符纸上的偈。`

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: { message?: string }
}

function buildUserPrompt(input: {
  birth: BirthInput
  context: ContextInput
  measurement: MeasurementInput
  result: FateResult
}) {
  const { birth, context, measurement, result } = input
  const { mainBranch, branches } = result

  const topBranches = branches.slice(0, 3).map((b) => `「${b.label}」p=${(b.probability * 100).toFixed(1)}%`).join('，')

  return `# 此次观测的输入与坍缩

## 观察者本命
- 出生日期: ${birth.birthDate || '未告知'}
- 出生时辰: ${birth.birthTime || '未告知'}
- 出生地点: ${birth.birthPlace || '未告知'}
- 人生主题: ${birth.lifeThemes.join('、') || '未告知'}
- 自我描述: ${birth.selfKeywords.join('、') || '未告知'}

## 此刻的问题与情境
- 核心问题: ${context.question || '未明言'}
- 问事宫位: ${context.questionType}
- 当下情绪: ${context.emotion}
- 处境标签: ${context.situationTags.join('、') || '无'}
- 时间窗口: ${context.timeHorizon}

## 观测仪式
- 仪式: ${measurement.ritualType}
- 符号: ${measurement.symbolChoice}

## 内部坍缩
- 概率最高的几支: ${topBranches}
- 此次坍缩落在: 「${mainBranch.label}」(p=${(mainBranch.probability * 100).toFixed(1)}%)
- 内部白描: ${result.quantumExplanation}

请按系统提示中的结构，针对上面这个具体的人和具体的问题，写出本次量子神谕。不要重复用户输入，不要解释。`
}

export type OracleProphecy = {
  raw: string
}

export async function generateOracleProphecy(input: {
  birth: BirthInput
  context: ContextInput
  measurement: MeasurementInput
  result: FateResult
  signal?: AbortSignal
}): Promise<OracleProphecy> {
  if (!API_KEY) {
    throw new Error('未配置 DeepSeek 密钥（VITE_DEEPSEEK_API_KEY）')
  }

  const userPrompt = buildUserPrompt(input)

  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    signal: input.signal,
    body: JSON.stringify({
      model: MODEL,
      temperature: 1.0,
      top_p: 0.9,
      max_tokens: 700,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`DeepSeek 调用失败 (${response.status}): ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as DeepSeekResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error(data.error?.message ?? '神谕未能成形：返回内容为空')
  }
  return { raw: content }
}
