import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils.js";
import { ArrowRight, Paperclip, X, FileText, Image, File } from "lucide-react";

const EpicInputForm = ({ onTasksGenerated }) => {
  const [epicDescription, setEpicDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const fileInputRef = useRef(null);

  const allowedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxImageSize = 5 * 1024 * 1024; // 5MB

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (fileType === "application/pdf") {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else {
      return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    if (isNaN(bytes)) return "Unknown size";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        let targetWidth = maxWidth;
        let targetQuality = quality;

        if (file.size > 2 * 1024 * 1024) {
          targetWidth = 600;
          targetQuality = 0.6;
        } else if (file.size > 1 * 1024 * 1024) {
          targetWidth = 700;
          targetQuality = 0.7;
        }

        if (width > targetWidth) {
          height = (height * targetWidth) / width;
          width = targetWidth;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", targetQuality);

        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const extractTextFromFile = async (file) => {
    return new Promise(async (resolve) => {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: e.target.result,
            thumbnail: null,
          });
        };
        reader.readAsText(file);
      } else if (file.type.startsWith("image/")) {
        try {
          // Compress image before converting to base64
          const compressedDataUrl = await compressImage(file);
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: `Image file: ${file.name} (${formatFileSize(file.size)})`,
            thumbnail: compressedDataUrl,
          });
        } catch (error) {
          console.error("Error compressing image:", error);
          // Fallback to original method if compression fails
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              content: `Image file: ${file.name} (${formatFileSize(file.size)})`,
              thumbnail: e.target.result,
            });
          };
          reader.readAsDataURL(file);
        }
      } else {
        // For PDF, Word docs, etc., we'll just include metadata
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          content: `Document file: ${file.name} (${formatFileSize(file.size)}) - ${file.type}`,
          thumbnail: null,
        });
      }
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    setIsProcessingFiles(true);

    try {
      for (const file of files) {
        if (!allowedFileTypes.includes(file.type)) {
          alert(
            `File type not supported: ${file.name}. Please upload PDF, Word, text, or image files.`
          );
          continue;
        }

        const maxSize = file.type.startsWith("image/")
          ? maxImageSize
          : maxFileSize;
        if (file.size > maxSize) {
          const maxSizeMB = Math.round(maxSize / (1024 * 1024));
          alert(
            `File too large: ${file.name}. Maximum size is ${maxSizeMB}MB.`
          );
          continue;
        }

        if (attachedDocuments.some((doc) => doc.name === file.name)) {
          alert(`File already attached: ${file.name}`);
          continue;
        }

        try {
          const processedFile = await extractTextFromFile(file);
          setAttachedDocuments((prev) => [...prev, processedFile]);
        } catch (error) {
          console.error("Error processing file:", error);
          alert(`Error processing file: ${file.name}`);
        }
      }
    } finally {
      setIsProcessingFiles(false);
    }

    e.target.value = "";
  };

  const removeDocument = (index) => {
    setAttachedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateTasks = async (e) => {
    e.preventDefault();

    if (!epicDescription.trim()) {
      alert(
        "Please enter a description for your epic before generating tasks."
      );
      return;
    }

    setIsGenerating(true);

    try {
      if (onTasksGenerated) {
        await onTasksGenerated(epicDescription, attachedDocuments);
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      alert("Failed to generate tasks. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mb-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl">
        <form onSubmit={handleGenerateTasks} className="space-y-6">
          <div>
            <label className="block text-lg font-semibold mb-4 text-gray-900">
              Describe Your Epic
            </label>
            <textarea
              value={epicDescription}
              onChange={(e) => setEpicDescription(e.target.value)}
              placeholder="Tell us about your project in detail. For example: 'Build a comprehensive e-commerce platform with user authentication, product catalog, shopping cart, payment processing, order management, and admin dashboard. Include features for inventory tracking, customer reviews, and analytics...'"
              className="w-full h-48 p-6 rounded-xl border border-gray-300 bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base leading-relaxed text-gray-900"
              disabled={isGenerating}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {epicDescription.length} characters
              </span>
              <span className="text-sm text-gray-500">
                Be as detailed as possible for better results
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-lg font-semibold text-gray-900">
                Attach Documents
              </label>
              <span className="text-sm text-gray-500">
                PDF, Word, text files (max 10MB) or images (max 5MB)
              </span>
            </div>

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isGenerating || isProcessingFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || isProcessingFiles}
                className={cn(
                  "w-full p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors",
                  "flex items-center justify-center gap-3 text-gray-600 font-medium",
                  (isGenerating || isProcessingFiles) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessingFiles ? (
                  <>
                    <div className="w-6 h-6 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                    Processing files...
                  </>
                ) : (
                  <>
                    <Paperclip className="w-6 h-6" />
                    Click to attach documents or drag and drop
                  </>
                )}
              </button>
            </div>

            {attachedDocuments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  Attached Documents ({attachedDocuments.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attachedDocuments.map((doc, index) => {
                    return (
                      <div
                        key={index}
                        className="relative group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {doc.thumbnail ? (
                              <img
                                src={doc.thumbnail}
                                alt={doc.name || "Document"}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                {getFileIcon(doc.type)}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.name || "Unknown file"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isGenerating || !epicDescription.trim()}
            className={cn(
              "w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-lg text-white",
              isGenerating || !epicDescription.trim()
                ? "opacity-50 cursor-not-allowed bg-blue-500"
                : "hover:scale-[1.02] hover:shadow-xl transform bg-blue-500 hover:bg-blue-600"
            )}
          >
            {isGenerating ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Tasks with AI...
              </>
            ) : (
              <>
                Generate Tasks
                <ArrowRight size={24} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EpicInputForm;
