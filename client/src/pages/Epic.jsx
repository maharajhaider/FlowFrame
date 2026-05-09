import EpicInputForm from "@/components/Epic/EpicInputForm.jsx";
import ContextDrawer from "@/components/Epic/ContextDrawer.jsx";
import ContextDrawerToggle from "@/components/Epic/ContextDrawerToggle.jsx";
import { fetchAIEpic } from "@/redux/slices/aiEpicSlice.js";
import Tasks from "@/pages/Tasks.jsx";
import { useState } from "react";
import { useDispatch } from "react-redux";

const EpicGenerator = () => {
  const [showResults, setShowResults] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const dispatch = useDispatch();

  const handleTasksGenerated = async (epicDescription, attachedDocuments) => {
    const result = await dispatch(fetchAIEpic({ prompt: epicDescription, attachments: attachedDocuments })).unwrap();
    setShowResults(true);
  };

  const toggleContextDrawer = () => {
    setContextDrawerOpen(!contextDrawerOpen);
  };

  return (
    <div className="min-h-screen pt-5">
      <EpicInputForm onTasksGenerated={handleTasksGenerated} />
      {showResults && <Tasks />}
      
      <ContextDrawerToggle 
        isOpen={contextDrawerOpen} 
        onToggle={toggleContextDrawer}
      />
      
      <ContextDrawer 
        isOpen={contextDrawerOpen}
        onClose={() => setContextDrawerOpen(false)}
      />
    </div>
  );
};

export default EpicGenerator;
