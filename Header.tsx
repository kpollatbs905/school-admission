
import React, { useState } from 'react';

interface Props {
  onHome: () => void;
  onAdmin: () => void;
}

const Header: React.FC<Props> = ({ onHome, onAdmin }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = "https://drive.google.com/thumbnail?id=1IjjdJpQYPGN2DlNa7QGHznqRjCu-oE1D&sz=w200";

  return (
    <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onHome}>
          <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden shadow-sm border border-slate-100">
            {!imgError ? (
              <img 
                src={logoUrl} 
                alt="โลโก้โรงเรียนท่าบ่อ" 
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white text-xs font-black italic">TB</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-blue-900 leading-none">โรงเรียนท่าบ่อ</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">THABO SCHOOL • NONG KHAI</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
           <button 
             onClick={onAdmin}
             className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all"
           >
             เจ้าหน้าที่
           </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
