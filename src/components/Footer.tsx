import React from 'react';

const Footer = () => {
  return (
    <footer className="py-12 flex justify-center items-center">
      <div className="px-6 py-2.5 bg-surface/30 backdrop-blur-md border border-white/5 rounded-full shadow-2xl hover:bg-surface/50 transition-all group cursor-default">
        <p className="text-[10px] font-bold text-content-muted tracking-[0.2em] uppercase select-none">
          Desenvolvido por <span className="text-content opacity-70">NEAR</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
