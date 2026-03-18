export const LoadingMain =()=> {
      return (
        <div className="relative z-10 w-11/12 max-w-lg p-8 md:p-12 rounded-3xl border border-white/30 bg-white/40 backdrop-blur-xl shadow-2xl flex flex-col items-start space-y-4">
        
        {/* Logo Lockup */}
        <div className="flex items-center space-x-2">
          <svg className="w-8 h-8 text-[#4D7C5F]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-2xl font-bold text-[#334155]">RentalFlow</span>
        </div>

        {/* Messaging */}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-medium text-[#1E293B]">
            Polishing up your perfect stay...
          </h2>
          <p className="text-sm md:text-base text-[#475569] italic">
            (Hang tight we are almost there!)
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#4D7C5F] transition-all duration-1000 ease-out" 
            style={{ width: '65%' }} // pass prop to be responsive. 
          />
        </div>
      </div>
      )
}