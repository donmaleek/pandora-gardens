import { FaHome, FaChartLine, FaUsers, FaMapMarkerAlt, FaMoneyBillWave, FaHandshake, FaShieldAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const teamMembers = [
    { name: "Mathias Mramba", role: "CEO & Founder", img: "./src/assets/CEO.jpg" },
    { name: "Calvin Mwilo", role: "Head of Operations", img: "./src/assets/DEV.jpeg" },
    { name: "Alfred Kashari", role: "Lead Developer", img: "./src/assets/HR.jpeg" }
];

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-gray-100 text-gray-900">
            {/* Hero Section */}
            <section className="relative bg-blue-900 bg-opacity-70 text-white py-20 text-center">
                <motion.div 
                    initial={{ opacity: 0, y: -50 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 1 }}
                >
                    <h1 className="text-4xl font-bold">Welcome to Pandora Gardens</h1>
                    <p className="mt-4 text-lg">Next-Level Real Estate & House Management Platform</p>
                </motion.div>
            </section>

            {/* Our Vision & Mission with Background Image */}
            <section 
                className="py-16 px-10 max-w-10xl mx-auto relative bg-cover bg-center text-white"
                style={{ backgroundImage: "url('./src/assets/Pandora_swahili_st.jpeg')" }}
            >
                <div className="absolute inset-0 bg-blue-900 bg-opacity-20"></div>
                <motion.div 
                    initial={{ opacity: 0, x: -50 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ duration: 1 }}
                    className="relative z-10"
                >
                    <h2 className="text-3xl font-bold text-center">Our Vision & Mission</h2>
                    <div className="mt-8 flex flex-col md:flex-row gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-md flex-1 text-gray-900">
                            <FaChartLine className="text-blue-700 text-4xl mb-4" />
                            <h3 className="text-2xl font-semibold">Our Vision</h3>
                            <p className="mt-2">
                                To be the leading real estate platform that seamlessly connects house seekers, tenants, and property managers in a digital, efficient, and secure environment.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md flex-1 text-gray-900">
                            <FaUsers className="text-blue-700 text-4xl mb-4" />
                            <h3 className="text-2xl font-semibold">Our Mission</h3>
                            <p className="mt-2">
                                Empowering users with cutting-edge tools for discovering properties, managing rentals, and handling transactions with ease and security.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Key Features */}
            <section className="bg-white py-16 px-8">
                <h2 className="text-3xl font-bold text-center text-blue-900">Key Features</h2>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[ 
                        { icon: FaHome, title: "Smart Property Search", desc: "Find properties easily with advanced filters and virtual tours." },
                        { icon: FaMoneyBillWave, title: "Mpesa Payments", desc: "Secure rent payments with automatic reminders." },
                        { icon: FaMapMarkerAlt, title: "Location Insights", desc: "Get data on schools, hospitals, and security before moving in." }
                    ].map((feature, index) => (
                        <motion.div 
                            key={index} 
                            className="bg-gray-50 p-6 rounded-lg shadow-md text-center"
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                        >
                            <feature.icon className="text-blue-700 text-4xl mb-4 mx-auto" />
                            <h3 className="text-2xl font-semibold">{feature.title}</h3>
                            <p className="mt-2 text-gray-700">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Meet Our Team */}
            <section className="py-16 px-8 bg-gray-50">
                <h2 className="text-3xl font-bold text-center text-blue-900">Meet Our Team</h2>
                <div className="mt-8 flex flex-wrap justify-center gap-8">
                    {teamMembers.map((member, index) => (
                        <motion.div 
                            key={index} 
                            className="bg-white p-6 rounded-lg shadow-md text-center max-w-xs"
                            initial={{ opacity: 0, y: 50 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                        >
                            <img src={member.img} alt={member.name} className="w-32 h-32 rounded-full mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">{member.name}</h3>
                            <p className="text-gray-700">{member.role}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Call to Action with Background Image */}
            <section 
                className="py-16 px-8 text-center text-white relative bg-cover bg-center"
                style={{ backgroundImage: "url('./src/assets/pandora-bg.jpeg')" }}
            >
                <div className="absolute inset-0 bg-blue-900 bg-opacity-30"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold">Start Your Real Estate Journey Today!</h2>
                    <p className="mt-4 text-lg max-w-2xl mx-auto">
                        Join thousands of happy tenants, landlords, and property managers who trust Pandora Gardens 
                        for seamless property management.
                    </p>
                    <button onClick={() => navigate('/login')}
                    className="mt-6 px-6 py-3 bg-white text-blue-900 font-semibold rounded-lg shadow-lg hover:bg-gray-200 transition duration-300 hover:shadow-xl hover:scale-105">
                        Get Started
                    </button>
                </div>
            </section>
        </div>
    );
};

export default About;
