import React from 'react';

const Footer = () => {
  return (
    <footer className="py-12 flex justify-center items-center">
      <div className="px-6 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle rounded-full shadow-sm hover:border-blue-500/30 transition-all group cursor-default">
        <p className="text-[10px] md:text-xs font-black text-content-muted tracking-[0.3em] uppercase opacity-70 select-none flex items-center gap-2">
          Desenvolvido por <span className="text-blue-600/60 group-hover:text-blue-600 transition-colors">NEAR</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
