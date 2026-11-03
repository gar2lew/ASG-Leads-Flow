import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-white p-1.5 ${className}`}>
      <Image
        src="/asg-logo.png"
        alt="Amplify Solutions Group"
        width={1191}
        height={330}
        className="h-auto w-full object-contain"
        unoptimized
        priority
      />
    </span>
  );
}
