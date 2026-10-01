/** DreamF1 lockup: wide wordmark + the red F1 speed mark (cropped from /logo.svg). */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[0.3em] whitespace-nowrap leading-none ${className}`}>
      <span aria-hidden="true" className="display text-[1em] leading-none tracking-[-0.01em] text-text-primary [overflow-wrap:normal]">
        Dream
      </span>
      <svg
        viewBox="44 220 512 163"
        className="h-[0.92em] w-auto shrink-0 text-f1-red"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M353.927702,555.191916l86.313562-83.33814h268.243943l-37.72988,44.755668h-176.803517l-43.373592,38.582472h-96.650516Z"
          transform="translate(-306.133547 -188.863712)"
        />
        <path
          fill="currentColor"
          d="M459.278487,454.08678l47.498739-45.65488l229.014767,1.292122L699.612656,455.3789l-240.334169-1.29212Z"
          transform="matrix(1.003978 0 0 0.944954 -308.510542 -162.25605)"
        />
        <path
          fill="currentColor"
          d="M721.147976,448.487597l30.149447-38.763575h109.83013L744.406119,562.6494h-86.141279l93.032583-114.161803h-30.149447Z"
          transform="translate(-308.921708 -183.509712)"
        />
      </svg>
      <span className="sr-only">DreamF1</span>
    </span>
  )
}
