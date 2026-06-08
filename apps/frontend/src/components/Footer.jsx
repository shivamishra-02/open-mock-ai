import { Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <div className="flex flex-col items-center gap-2 mt-10 pb-6">
      <p className="text-white/20 text-xs">Developed by</p>
      <p className="text-white/50 text-sm font-medium">Shivam Mishra</p>
      <div className="flex items-center gap-4">
        <a
          href="https://www.linkedin.com/in/shivam-mishra-3a741b253/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white/30 hover:text-blue-400 transition-colors text-xs"
        >
          <Linkedin size={13} />
          LinkedIn
        </a>
        <span className="text-white/10">·</span>
        <a
          href="https://github.com/shivamishra-02"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors text-xs"
        >
          <Github size={13} />
          GitHub
        </a>
      </div>
    </div>
  );
}