import React from 'react';
import ColorExtractorCard from '../components/ColorExtractorCard';

export const ColorExtractorDemo = () => {
  const sampleCards = [
    {
      id: 1,
      imageSrc: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      title: 'Neon Odyssey',
      description: 'Explore the futuristic, cyber-laced alleyways of Neo-Tokyo. A vibrant palette of synthwave purples and deep magenta glow from within.',
    },
    {
      id: 2,
      imageSrc: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
      title: 'Ethereal Canopy',
      description: 'Immerse yourself in the tranquility of the ancient redwood forest. Dynamically pulls rich moss greens and earthy leaf undertones.',
    },
    {
      id: 3,
      imageSrc: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      title: 'Solitude Coast',
      description: 'Feel the warmth of the setting sun over soft tropical waters. Dynamically tints with pastel brand, sand yellow, and deep teal.',
    },
  ];

  return (
    <div className="min-h-screen bg-cn-bg text-cn-text py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <span className="px-3 py-1 text-xs font-semibold tracking-wider text-purple-400 uppercase bg-purple-950/40 rounded-full border border-purple-800/30">
          Component Showcase
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          Dynamic Color Extractor Card
        </h1>
        <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto">
          A reusable React card that dynamically extracts the dominant color from its source image in real-time, applying it as a soft backdrop tint and a vibrant box-shadow glow.
        </p>
      </div>

      {/* Grid of Cards */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center mb-16">
        {sampleCards.map((card) => (
          <ColorExtractorCard
            key={card.id}
            imageSrc={card.imageSrc}
            title={card.title}
            description={card.description}
          />
        ))}
      </div>

      {/* Technical Details & CORS Caveats Section */}
      <div className="max-w-3xl mx-auto bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md">
        <h2 className="text-xl font-semibold mb-4 text-neutral-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Technical Implementation & CORS Caveats
        </h2>
        
        <div className="space-y-4 text-sm text-neutral-400 leading-relaxed">
          <p>
            1. <strong className="text-neutral-200">How it works:</strong> The component utilizes a <code className="text-purple-300 font-mono">useRef</code> to reference the underlying <code className="text-purple-300 font-mono">&lt;img&gt;</code> element. Once loaded, the image's <code className="text-purple-300 font-mono">onLoad</code> handler triggers <code className="text-purple-300 font-mono">colorthief</code> to analyze the pixels and return the dominant RGB value.
          </p>
          <p>
            2. <strong className="text-neutral-200">The CORS Requirement:</strong> Because <code className="text-purple-300 font-mono">colorthief</code> draws the image onto a temporary HTML5 canvas to extract pixel data, the browser enforces the Same-Origin Policy.
          </p>
          <div className="bg-cn-surface rounded-xl p-4 border border-neutral-800 font-mono text-[13px] text-neutral-300 space-y-2">
            <div>{`// 1. Element property:`}</div>
            <div className="text-purple-400">{`&lt;img crossOrigin="anonymous" onLoad={handleImageLoad} /&gt;`}</div>
            <div className="mt-2">{`// 2. Server Response Header requirement:`}</div>
            <div className="text-purple-400">{`Access-Control-Allow-Origin: *`}</div>
          </div>
          <p>
            3. <strong className="text-neutral-200">Canvas Tainting Error:</strong> If the hosting server does not send the CORS header, setting <code className="text-purple-300 font-mono">crossOrigin="anonymous"</code> will cause the image load to fail entirely. If you omit <code className="text-purple-300 font-mono">crossOrigin</code>, the image will load but <code className="text-purple-300 font-mono">colorthief</code> will fail with a <code className="text-red-400">SecurityError</code> when trying to read canvas pixel data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ColorExtractorDemo;
