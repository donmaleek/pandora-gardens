import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-blue-800/40 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-2 z-50">
          <img
            src="/pandora-1-lg.png"
            alt="Pandora Gardens Logo"
            className="h-9 w-9 sm:h-12 sm:w-12"
          />
          <span className="text-xl sm:text-2xl font-bold tracking-tight">
            Pandora Gardens
          </span>
        </Link>

        {/* Desktop Search and Navigation */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search properties..."
              className="w-full px-6 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-gray-200 pr-12"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors">
              <Search className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/about" className="hover:text-gray-300 transition-colors">
            About
          </Link>
          <Link to="/jobs" className="hover:text-gray-300 transition-colors">
            Jobs
          </Link>
          <Link to="/register" className="hover:text-gray-300 transition-colors">
            Register
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden absolute w-full bg-blue-900/95 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search properties..."
                className="w-full px-4 py-2 rounded-full bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-gray-200 pr-12"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors">
                <Search className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2 text-sm font-medium">
              <Link to="/" onClick={() => setIsOpen(false)} className="px-4 py-2 hover:bg-white/10 rounded-lg">
                Home
              </Link>
              <Link to="/about" onClick={() => setIsOpen(false)} className="px-4 py-2 hover:bg-white/10 rounded-lg">
                About
              </Link>
              <Link to="/register" onClick={() => setIsOpen(false)} className="px-4 py-2 hover:bg-white/10 rounded-lg">
                Register
              </Link>
              <Link to="/login" onClick={() => setIsOpen(false)} className="px-4 py-2 text-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
