import { useState } from "react";
import { motion } from "framer-motion";
import { FaSearch, FaCommentDots } from "react-icons/fa";

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('./src/assets/pandora-21.jpeg')" }}>
        <div className="h-full flex flex-col items-center justify-center text-white bg-black/50">
          <motion.h1 
            className="text-5xl font-bold text-center mb-6"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Find Your Dream Home with <span className="text-blue-400">Pandora Gardens</span>
          </motion.h1>
          
          {/* Search Bar */}
          <motion.div 
            className="bg-white p-3 rounded-lg flex items-center w-[90%] max-w-md shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <FaSearch className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search by location, price..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none text-gray-700"
            />
            <button className="ml-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Search</button>
          </motion.div>
        </div>
      </div>

      {/* Featured Properties Section */}
      <section className="py-16 px-6">
        <h2 className="text-3xl font-bold text-center mb-8">Featured Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <motion.div 
              key={item} 
              className="bg-white p-4 shadow-lg rounded-lg"
              whileHover={{ scale: 1.05 }}
            >
              <img src={`/assets/property-${item}.jpg`} alt="Property" className="w-full h-48 object-cover rounded-lg" />
              <h3 className="text-xl font-semibold mt-4">Luxury Apartment {item}</h3>
              <p className="text-gray-600">ksh. 1,500 / month</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI-Powered Property Recommendations */}
      <section className="py-16 bg-gray-50 px-6">
        <h2 className="text-3xl font-bold text-center mb-8">Recommended For You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[4, 5, 6].map((item) => (
            <motion.div 
              key={item} 
              className="bg-white p-4 shadow-lg rounded-lg"
              whileHover={{ scale: 1.05 }}
            >
              <img src={`/assets/property-${item}.jpg`} alt="Property" className="w-full h-48 object-cover rounded-lg" />
              <h3 className="text-xl font-semibold mt-4">Smart Home {item}</h3>
              <p className="text-gray-600">ksh. 2,000 / month</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-blue-50 px-6">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { title: "Search Properties", desc: "Find the perfect home with our powerful search tools." },
            { title: "Schedule a Tour", desc: "Visit properties in person or through virtual tours." },
            { title: "Secure Your Home", desc: "Apply online, sign documents, and move in with ease." }
          ].map((step, index) => (
            <motion.div 
              key={index} 
              className="bg-white p-6 shadow-lg rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Floating Chat Assistant */}
      <div className="fixed bottom-4 right-4">
        <button 
          className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <FaCommentDots size={24} />
        </button>
        {chatOpen && (
          <div className="bg-white p-4 rounded-lg shadow-lg absolute bottom-12 right-0 w-64">
            <h3 className="font-semibold">Chat Assistant</h3>
            <p className="text-sm text-gray-600">How can we assist you today?</p>
          </div>
        )}
      </div>
    </div>
  );
}
