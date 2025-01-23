import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "@/auth/AuthContext";
import { Question } from "@/types/Question";
import { useNavigate } from "react-router";
import db from "@/lib/db";

const baseURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key="
const apiKey = "AIzaSyBjCKEmQ9tw4Ve8H3L-J2WvVrfBRRAf2Vg";

const systemPrompt =
  'You are a quiz bot.Output only valid JSON in this exact format: [{"question":string,"options":string[],"answer":number,"category":string}]';

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
      const requestBody = {
        contents: [{
          role: "user",
          parts: [
            {text: systemPrompt},
              {text: `Generate topics from ${searchQuery} as questions with 4 options each and same category.Output only valid JSON with no additional text or formatting fully`}]
          }],
        
    };
    console.log(requestBody);
    const response = await fetch(baseURL + apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
         "x-goog-api-key": apiKey, // Pass API key as header
      },
      body: JSON.stringify(requestBody),
    });
      
      if (!response.ok) {
          const errorData = await response.json(); // try to get more detailed error message
          console.error("Gemini API error:", errorData);
        setError(`Failed to fetch questions (HTTP ${response.status}): ${JSON.stringify(errorData)}`);
        return;
      }
      
      const dataRes = await response.json();
      console.log(dataRes);
      const responseText = dataRes?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
          setError("Failed to get valid response content from Gemini");
          return;
        }

       const cleanText = responseText
       .replace(/^```json/, '')  // Remove ```json at the start
       .replace(/```$/, '')      // Remove ``` at the end
       .trim();
 
     // Debug: Log the cleanText to inspect its contents
     console.log('Cleaned Text:', cleanText.substring(0, cleanText.length - 3));

       if (!cleanText) {
          setError("Failed to fetch questions");
          return;
        }

        const questions: Question[] = JSON.parse(cleanText.substring(0, cleanText.length - 3)).map((q: any, index: number) => ({
            ...q,
            id: index,
          }));

      const category = questions[0].category;
      //set all questions to same category
      questions.forEach((q) => {
        q.category = category;
      });

      setQuestions(questions);
      console.log(questions);
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
      setQuestions(datawithIds);

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
                  navigate(`/camera-check?category=${questions[0].category}`);
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
