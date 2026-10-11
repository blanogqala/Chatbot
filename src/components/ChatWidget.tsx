
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const openChat = (event: Event) => {
      setIsOpen(true);
      const question = (event as CustomEvent<string>).detail;
      if (typeof question === 'string') setInput(question);
    };
    window.addEventListener('open-capaciti-chat', openChat);
    return () => window.removeEventListener('open-capaciti-chat', openChat);
  }, []);
  const requestVersion = useRef(0);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    requestVersion.current++;
    sending.current = false;
    setIsLoading(false);
    setMessages([]);
    setInput("");
    if (userId) {
      supabase.from('chat_history').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(100)
        .then(({ data, error }) => {
          if (!active) return;
          if (error) { toast({ title: "History unavailable", description: "You can still ask a new question." }); return; }
          setMessages((data || []).reverse().map(msg => ({ id: msg.id, content: msg.message, isBot: msg.is_bot, timestamp: new Date(msg.created_at) })));
        });
    }
    return () => { active = false; requestVersion.current++; };
  }, [userId, toast]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending.current) return;
    sending.current = true;
    const version = requestVersion.current;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage: Message = {
      content: userMessage,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await supabase.functions.invoke('chat', {
        body: { message: userMessage }
      });

      if (version !== requestVersion.current) return;
      if (response.error) {
        const context = (response.error as { context?: Response }).context;
        const detail = context ? await context.json().catch(() => null) : null;
        throw new Error(detail?.error || "The assistant could not connect. Please try again.");
      }
      if (typeof response.data?.response !== 'string' || !response.data.response.trim()) throw new Error("The assistant returned an empty answer. Please retry.");

      // Add bot response to chat
      const botMessage: Message = {
        content: response.data.response,
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

      if (response.data.historySaved === false) toast({ title: "Answer received", description: "This conversation could not be saved to your history." });
    } catch (error) {
      if (version !== requestVersion.current) return;
      setInput(userMessage);
      setMessages(prev => prev.filter(item => item !== newUserMessage));
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
      });
    } finally {
      if (version === requestVersion.current) { sending.current = false; setIsLoading(false); }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        aria-label={isOpen ? "Close chat" : "Open chat"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 h-[600px] glass rounded-lg shadow-2xl slide-up">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold">CAPACITI Assistant</h3>
            <p className="text-sm text-white/70">
              Ask me anything about CAPACITI
            </p>
          </div>
          
          <div className="p-4 h-[calc(100%-140px)] overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-2 items-start",
                    msg.isBot ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-lg max-w-[80%]",
                    msg.isBot ? "bg-muted/50" : "bg-primary text-primary-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                aria-label="Your message"
                maxLength={2000}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 rounded-md bg-white/5 border border-white/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button 
                aria-label="Send message"
                type="submit" 
                size="icon" 
                disabled={isLoading}
                className="bg-primary text-primary-foreground"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
