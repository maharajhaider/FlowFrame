import React from "react";
import { Zap, Lightbulb, Users, BarChart } from "lucide-react";

const Home = () => {
  const features = [
    {
      icon: Lightbulb,
      title: "AI Task Generation",
      description:
        "Transform your epic descriptions into detailed, actionable tasks and subtasks automatically using advanced AI.",
    },
    {
      icon: Users,
      title: "Smart Auto-Assignment",
      description:
        "Intelligently assign tasks to team members based on their skills, experience, and current workload.",
    },
    {
      icon: BarChart,
      title: "Cascading Updates",
      description:
        "Update parent tasks and watch subtasks adapt automatically with AI-powered context awareness.",
    },
  ];

  return (
    <div className="max-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Zap size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Transform Ideas into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              Action
            </span>
          </h1>

          <p className="text-xl mb-4 text-gray-600">
            Describe your project epic and let AI break it down into manageable
            tasks, assign them intelligently, and keep everything in sync.
          </p>

          <p className="text-lg text-gray-600">
            The future of project management is here - powered by artificial
            intelligence.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-xl border border-gray-200 text-center group hover:shadow-lg transition-all duration-300 bg-white"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-50 mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={28} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                {feature.title}
              </h3>
              <p className="text-base leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-sm font-medium mb-4 text-blue-600">
            <Zap size={16} />
            Ready to get started?
          </div>
          <p className="text-lg text-gray-600">
            Join thousands of teams using AI to streamline their project
            management workflow.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
