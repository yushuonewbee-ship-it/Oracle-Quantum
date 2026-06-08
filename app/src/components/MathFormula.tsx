import katex from 'katex'
import 'katex/dist/katex.min.css'

type MathFormulaProps = {
  latex: string
  block?: boolean
  className?: string
}

export default function MathFormula({ latex, block = true, className = '' }: MathFormulaProps) {
  const html = katex.renderToString(latex, {
    displayMode: block,
    throwOnError: false,
    strict: false,
  })

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
