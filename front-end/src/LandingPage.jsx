import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const logoPath = '/logo.svg';

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Animated circles background
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    // Create subtle animated background circles
    const circles = Array.from({ length: 3 }, (_, i) => ({
      x: w / 2,
      y: h / 2,
      r: Math.min(w, h) / (i + 3),
      dir: 1,
      opacity: 0.03 + (i * 0.01),
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      circles.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(45, 212, 191, ${c.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Animate radius
        c.r += c.dir * 0.3;
        const maxR = Math.min(w, h) / (i + 2.5);
        const minR = Math.min(w, h) / (i + 3.5);
        if (c.r > maxR || c.r < minR) {
          c.dir *= -1;
        }
      });
      requestAnimationFrame(draw);
    }

    draw();

    // Handle resizing
    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      circles.forEach((c, i) => {
        c.x = w / 2;
        c.y = h / 2;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems = [
  { label: 'Brand Monitoring', path: '/login/brand-monitoring' },
  { label: 'Threat Intelligence', path: '/login/threat-intelligence' },
  { label: 'Email DLP', path: '/login/email-dlp' },
  { label: 'Compliance Monitoring', path: '/login/compliance-monitoring' },
  { label: 'Cloud Configuration', path: '/login/cloud-configuration' },
];


  const stats = [
    { 
      number: '500K+', 
      label: 'Threats Blocked',
      sublabel: 'in the last 12 months'
    },
    { 
      number: '99.9%', 
      label: 'Detection Rate',
      sublabel: 'backed by enterprise-grade AI'
    },
    { 
      number: '24/7', 
      label: 'Monitoring',
      sublabel: 'continuous threat surveillance'
    },
    { 
      number: '1000+', 
      label: 'Enterprise Clients',
      sublabel: 'trusted worldwide'
    },
  ];

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">SecureAI</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="text-gray-600 hover:text-teal-600 hover:underline underline-offset-4 font-medium transition-colors duration-200 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/login/grc')} 
            className="text-gray-600 hover:text-teal-600 font-medium transition-colors duration-200 cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/get-started')}
            className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors duration-200 font-medium cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-20">
          <p className="text-sm uppercase text-teal-600 mb-4 font-semibold tracking-wider">
            AI-Powered Security Platform
          </p>
          <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-teal-500">Next-Gen</span> Digital<br />
            Security <span className="text-teal-500">AI Platform</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Protect your enterprise with AI-powered compliance, monitoring, and risk detection
          </p>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            Fast, secure, agentic automation for next-generation cybersecurity challenges.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => navigate('/contact-sales')}
              className="px-8 py-4 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors duration-200 font-semibold text-lg cursor-pointer"
            >
              Contact Sales
            </button>
            <button
              onClick={() => navigate('/watch-demo')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-teal-500 hover:text-teal-600 transition-colors duration-200 font-semibold text-lg cursor-pointer"
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <section className="mb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-4xl font-bold text-teal-600 mb-2">{stat.number}</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-50 text-gray-600 px-8 py-16 mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-lg">Platform</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Brand Monitoring</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Threat Intelligence</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Email DLP</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Compliance Monitoring</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Cloud Configuration</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-lg">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-lg">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Security Center</a></li>
                <li><a href="#" className="hover:text-teal-600 hover:underline underline-offset-4 transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-6 text-lg">Social</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-red-500 rounded text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-blue-600 rounded text-white flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-black rounded text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-teal-500 rounded text-white flex items-center justify-center hover:bg-teal-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.747 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-gray-500">© 2025 SecureAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}