import React from 'react';
import { Mail, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-gray-300 py-12 mt-20 border-t border-gray-800">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand & About */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-3xl font-bold text-white tracking-tight">TURFION</h3>
              <p className="mt-4 text-gray-400 leading-relaxed max-w-2xl">
                Your premier platform for discovering and booking top-quality sports venues. 
                Connect with players, join games, and elevate your sporting experience.
              </p>
            </div>

            <div className="flex items-center gap-3 text-gray-400">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <a
                href="mailto:info@turfion.com"
                className="hover:text-blue-400 transition-colors duration-300 font-medium"
              >
                info@turfion.com
              </a>
            </div>

            <p className="text-sm text-gray-500">
              Proudly built by <span className="font-semibold text-white">Akxtral</span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: 'Home', href: '/' },
                { label: 'Join Games', href: '/games' },
                { label: 'Profile', href: '/profile' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors duration-300 font-medium group"
                  >
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p className="text-gray-500">
            © {currentYear} <span className="text-white font-medium">TURFION</span>. All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-gray-500">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span>for sports enthusiasts</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;