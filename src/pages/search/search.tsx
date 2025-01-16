import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import OpenAI from "openai";
import { useAuth } from "@/auth/AuthContext";
import { Question } from "@/types/Question";
import { useNavigate } from "react-router";
import db from "@/lib/db";

const baseURL = "https://api.aimlapi.com/v1";
const apiKey = "57b59c54d1af40739e5413f6fe66e60e";

const systemPrompt =
  'You are a quiz bot.Output only valid JSON in this exact format: [{"question":string,"options":string[],"answer":number,"category":string}]';
const userPrompt =
  "Generate 5 {query} questions with 4 options each.Output only valid JSON with no additional text or formatting";

const api = new OpenAI({
  apiKey,
  baseURL,
  dangerouslyAllowBrowser: true,
});

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useAuth();
  const navigate = useNavigate();

  const searchQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const completion = await api.chat.completions.create({
        model: "meta-llama/Llama-3-8b-chat-hf",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt.replace("{query}", searchQuery),
          },
        ],
      });
      const response = completion.choices[0].message.content;
      const startIndex = response?.indexOf("[");
      const trimmedResponse = response?.substring(startIndex as number);
      const data = JSON.parse(trimmedResponse || "{}");
      console.log(data);

      if (!data) {
        setError("Failed to fetch questions");
        return;
      }

      const questions: Question[] = data.map((q: any, index: number) => ({
        ...q,
        id: index,
      }));

      setQuestions(questions);
      const docs = await db.questions.find().exec();

      const datawithIds = questions.map((q) => {
        const existingDoc = docs.find((doc) => doc.question === q.question);
        if (existingDoc) {
          return { ...q, id: existingDoc.id };
        } else {
          return {
            ...q,
            id: uuidv4(),
          };
        }
      });

      await db.questions.bulkInsert(datawithIds);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Search Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for questions..."
              className="flex-1"
            />
            <Button
              onClick={searchQuestions}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">
                    {index + 1}. {question.question}
                  </h3>
                  <div className="ml-4 space-y-1">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded ${
                          optIndex === question.answer
                            ? "bg-green-100"
                            : "bg-gray-50"
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-2 justify-between items-center flex">
            <Button
              className="w-full"
              onClick={() => {
                if (questions.length > 0)
                  navigate(`/?category=${questions[0].category}`);
                else navigate(`/`);
              }}
            >
              Start Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchPage;
