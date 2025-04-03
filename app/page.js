"use client";
import { useState, useRef, useEffect, memo } from "react";
import { GoogleGenAI } from "@google/genai"; // CORRECT IMPORT
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Image as ImageIcon, Type as TextIcon, AlertTriangle } from "lucide-react";

// Memoized ImageMessage component to prevent rerendering on typing
const ImageMessage = memo(({ url, caption }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <div className="space-y-2">
      {caption && <p className="text-xs text-zinc-400 italic mb-1">{caption}</p>}
      
      <div className="relative rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{animationDelay: "150ms"}}></div>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{animationDelay: "300ms"}}></div>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Failed to load image</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 text-xs hover:underline mt-1 block"
            >
              Try opening directly
            </a>
          </div>
        ) : (
          <img
            src={url}
            alt={caption || "Generated image"}
            className={`rounded-lg max-w-full h-auto ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onLoad={() => {
              setLoading(false);
              // Don't call scrollToBottom here - we'll handle it differently
            }}
            onError={() => {
              setLoading(false);
              setError(true);
              console.error("Image failed to load:", url);
            }}
          />
        )}
      </div>
    </div>
  );
});

// Give it a display name for better debugging
ImageMessage.displayName = 'ImageMessage';

export default function Home() {
  const [messages, setMessages] = useState([
    { id: Date.now().toString(), text: "Hello! Ask me for text or to generate an image.", isUser: false },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [selectedModel, setSelectedModel] = useState("text");
  const messagesEndRef = useRef(null);
  const genAI = useRef(null); // Store the client instance

  // Initialize API Client and check key
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error(
        "API Key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local"
      );
      setApiKeyMissing(true);
    } else {
      setApiKeyMissing(false);
      // Initialize the client with the new library
      genAI.current = new GoogleGenAI({ apiKey });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- generateAIResponse ---
  const generateAIResponse = async (prompt, mode) => {
    if (apiKeyMissing || !genAI.current) {
      return {
        type: "error",
        content: "API key is missing or client failed to initialize. Please check your .env.local file and reload.",
      };
    }

    setIsLoading(true);

    try {
      if (mode === "text") {
        // Text generation with the new library
        const model = genAI.current.models.getGenerativeModel({
          model: "gemini-1.5-flash"
        });
        
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        const text = result.response.text();
        return { type: "text", content: text };

      } else if (mode === "image") {
        try {
          console.log("Using Gemini native image generation");
          
          // Image generation with the new library
          const model = genAI.current.models.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation"
          });
          
          // Format the request properly for image generation
          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseModalities: ["Text", "Image"],
            },
          });
          
          let imageData = null;
          let caption = "";
          
          // Process the response to find image data
          for (const part of result.response.candidates[0]?.content.parts || []) {
            if (part.text) {
              caption = part.text;
            } else if (part.inlineData) {
              imageData = part.inlineData.data;
            }
          }
          
          if (imageData) {
            const imageUrl = `data:image/png;base64,${imageData}`;
            return { 
              type: "image", 
              content: imageUrl,
              caption: caption || `Generated image for: "${prompt}"`
            };
          } else {
            throw new Error("No image data found in response");
          }
        } catch (error) {
          // Keep fallback code the same
          console.error("Error generating image:", error);
          
          const errorMessage = error.message || "Unknown error";
          console.log("Error details:", errorMessage);
          
          console.warn("Falling back to placeholder image");
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          let seed = Math.floor(Math.random() * 1000);
          let imageUrl = `https://picsum.photos/seed/${seed}/512/512?t=${Date.now()}`;
          
          return { 
            type: "image", 
            content: imageUrl,
            caption: `Image placeholder (API error: ${errorMessage.substring(0, 50)}...)`
          };
        }
      } else {
         return { type: "error", content: "Invalid mode selected." };
      }

    } catch (error) {
      // Keep error handling the same
      console.error(`Error generating AI response (mode: ${mode}):`, error);
      let errorMessage = "Something went wrong with the AI service.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.toString().includes('API key not valid')) {
         errorMessage = "API Key not valid. Please check your API key.";
      } else if (error.toString().includes('quota')) {
          errorMessage = "Quota exceeded. Please check your Google Cloud project quotas.";
      }
      
      return { type: "error", content: `Error: ${errorMessage}` };
    } finally {
      setIsLoading(false);
    }
  };

  // --- handleSendMessage ---
  const handleSendMessage = async () => {
    const messageText = inputMessage.trim();
    if (messageText === "" || isLoading) return;

    const newUserMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
    };
    
    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");

    // Get AI response (handle potential errors)
    const aiResponse = await generateAIResponse(messageText, selectedModel);

    let newAiMessage;
    if (aiResponse.type === 'error') {
      newAiMessage = {
        id: `ai-error-${Date.now()}`,
        text: aiResponse.content,
        isUser: false,
        isError: true, // Mark as error
      };
    } else if (aiResponse.type === 'text') {
       newAiMessage = {
        id: `ai-text-${Date.now()}`,
        text: aiResponse.content,
        isUser: false,
      };
    } else if (aiResponse.type === 'image') {
      console.log("Creating image message with URL:", aiResponse.content.substring(0, 50) + "...");
      newAiMessage = {
        id: `ai-image-${Date.now()}`,
        text: aiResponse.caption || `Generated image based on: "${messageText}"`,
        imageUrl: aiResponse.content,
        isUser: false,
      };
    } else {
       // Should not happen, but handle defensively
        newAiMessage = {
            id: `ai-unknown-${Date.now()}`,
            text: "Received an unexpected response type.",
            isUser: false,
            isError: true,
        };
    }

    setMessages((prev) => [...prev, newAiMessage]);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      <Card className="w-full max-w-xl h-[85vh] flex flex-col border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl shadow-blue-900/5">
        {/* Card Header */}
        <CardHeader className="border-b border-zinc-800 px-6 pb-4 pt-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Title and Avatar */}
            <div className="flex items-center">
              <Avatar className="mr-3 h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700">
                <AvatarImage
                  src="/logo.jpg" 
                  alt="AI Avatar"
                  className={"rounded-full object-cover"}
                />
                <AvatarFallback className="text-white text-xs">AI</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Cupiri Mahinda
              </CardTitle>
            </div>

            {/* Model Selection Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedModel("text")}
                className={`px-3 py-1 rounded-md flex items-center transition-colors ${
                  selectedModel === "text"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                <TextIcon className="h-3.5 w-3.5 mr-1.5" />
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedModel("image")}
                className={`px-3 py-1 rounded-md flex items-center transition-colors ${
                  selectedModel === "image"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                Images
              </Button>
            </div>
          </div>

          {/* API Key Warning */}
           {apiKeyMissing && (
            <div className="mt-3 bg-red-950 border border-red-800 px-3 py-1.5 text-red-300 text-xs rounded-md flex items-center">
               <AlertTriangle className="h-4 w-4 mr-2 text-red-400"/>
               API key missing. Check `NEXT_PUBLIC_GEMINI_API_KEY` in `.env.local`.
            </div>
           )}

           {/* Model Indicator */}
            <div className="mt-2 text-xs text-zinc-500 flex items-center justify-center">
                <span className="mr-1">Mode:</span>
                <span className="font-medium text-blue-400">
                    {selectedModel === "text" 
                      ? "Text Generation (Gemini 1.5 Flash)" 
                      : "Image Generation (Gemini 2.0 Flash)"}
                </span>
            </div>
        </CardHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-grow h-full px-4 py-4 overflow-y-auto" id="chat-scroll-area">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div className="flex gap-3 max-w-[85%]">
                  {/* AI Avatar */}
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700 mt-0.5 flex-shrink-0">
                      <AvatarImage
                        src="/logo.jpg"
                        alt="AI Avatar"
                        className={"rounded-full object-cover"}
                      />
                      <AvatarFallback className="text-white text-xs">AI</AvatarFallback>
                    </Avatar>
                  )}

                  {/* Message Content */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.isUser
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : message.isError
                        ? "bg-red-900/80 text-red-200 border border-red-800/50"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {/* Render Text or Image */}
                    {message.imageUrl ? (
                      <ImageMessage url={message.imageUrl} caption={message.text} />
                    ) : message.text ? (
                        message.isUser || message.isError ? (
                             <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                        ) : (
                          <div className="markdown-content text-sm leading-relaxed">
                            <ReactMarkdown
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline ? (
                                    <div className="bg-zinc-900 rounded-md my-2 overflow-hidden border border-zinc-700/50">
                                      <div className="px-4 py-1.5 border-b border-zinc-700 text-xs text-zinc-400 flex justify-between items-center">
                                        <span>{match ? match[1] : 'Code'}</span>
                                      </div>
                                      <pre className="p-4 overflow-x-auto text-xs">
                                        <code className={className} {...props}>
                                          {children}
                                        </code>
                                      </pre>
                                    </div>
                                  ) : (
                                    <code className="bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )
                    ) : null }
                  </div>

                  {/* User Avatar */}
                  {message.isUser && (
                    <Avatar className="h-8 w-8 bg-zinc-700 mt-0.5 flex-shrink-0">
                      <AvatarFallback className="text-zinc-200 text-xs">You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700 mt-0.5 flex-shrink-0">
                     <AvatarFallback className="text-white text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-zinc-800 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <CardFooter className="border-t border-zinc-800 p-4 flex-shrink-0">
          <div className="flex w-full gap-2 items-center">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
              placeholder={selectedModel === 'text' ? "Ask anything..." : "Describe the image to generate..."}
              className="flex-1 bg-zinc-800 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
              disabled={isLoading || apiKeyMissing}
              aria-label="Chat input"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || inputMessage.trim() === "" || apiKeyMissing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2 h-9 w-9"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
