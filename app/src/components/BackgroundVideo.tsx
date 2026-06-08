type BackgroundVideoProps = {
  src: string
  className?: string
  opacity?: number
  overlay?: string
}

export default function BackgroundVideo({
  src,
  className = '',
  opacity = 0.38,
  overlay = 'linear-gradient(180deg, rgba(5,5,8,0.50), rgba(5,5,8,0.74))',
}: BackgroundVideoProps) {
  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`} aria-hidden>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{ opacity }}
      />
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  )
}
