import type { QuestionType } from '../types/fate'

export function generateShortAdvice(outcomeId: string, questionType: QuestionType): string {
  const adviceMap: Record<QuestionType, Record<string, string>> = {
    career: {
      stay: '巩固当前基础，等待更好的时机再行动',
      move: '开始准备简历和网络，探索新的可能性',
      wait: '观察行业动向，积累关键技能',
      sidePath: '利用业余时间尝试副业或兴趣项目',
    },
    relationship: {
      approach: '找一个自然的时机表达你的心意',
      observe: '给自己和对方更多时间了解彼此',
      release: '专注于自我成长，放下执念',
      repair: '主动开启一次真诚的对话',
    },
    study: {
      deepDive: '选择一个方向深入钻研',
      broaden: '阅读跨学科的书籍和论文',
      rest: '适当休息，调整学习节奏',
      seekHelp: '向导师或同学请教困惑之处',
    },
    wealth: {
      conserve: '控制支出，建立应急储备',
      invest: '在小范围内尝试投资机会',
      diversify: '分散配置，降低单一风险',
      hold: '暂不做出重大财务决策',
    },
    social: {
      engage: '主动参与社交活动，拓展人脉',
      stepBack: '减少社交频率，关注核心关系',
      rebuild: '主动联系许久未见的朋友',
      observe: '观察社交动态，找到合适的切入点',
    },
    creative: {
      execute: '立即开始你最想做的那个项目',
      iterate: '每天完成一小部分，积少成多',
      absorb: '去博物馆、看展、阅读，汲取灵感',
      complete: '把正在做的作品收尾并展示',
    },
    daily: {
      flow: '顺应当下的节奏，不强求结果',
      focus: '选择最重要的一件事全力完成',
      rest: '今天适合放松身心，不要给自己太多任务',
      explore: '尝试一条新的路线或新的餐厅',
    },
    majorChoice: {
      commit: '一旦决定就全力以赴，不要回头',
      delay: '给自己更多时间收集信息',
      splitTest: '用最小成本验证你的假设',
      exit: '优雅地退出，准备好迎接新开始',
      unexpected: '保持开放心态，拥抱不确定性',
    },
  }

  const typeAdvice = adviceMap[questionType]
  return typeAdvice?.[outcomeId] || '根据当前态势，选择最适合你的方向'
}
