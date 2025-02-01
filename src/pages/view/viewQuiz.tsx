import {useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {useToast} from "@/hooks/use-toast.ts";
import axios from "axios";
import {Question} from "@/types/Question.ts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft} from "lucide-react";

export default function ViewQuiz() {
    const [quiz, setQuiz] = useState<Question[]>([])
    const params = useParams();
    const quizCode = params.quizCode;
    const navigate = useNavigate()
    const {toast} = useToast()

    useEffect(() => {
        if (quizCode) {
            fetchQuestions(quizCode);
        } else {
            toast({
                title: "Invalid Quiz Code",
                description: "No quiz code provided. Please start over.",
                variant: "destructive",
            })
            navigate("/")
        }

        return () => {
        }
    }, [toast, navigate])

    const fetchQuestions = async (quizCode: string) => {
        try {
            const response = await axios.get(`http://127.0.0.1:5000/api/quiz/${quizCode}`)
            const quiz = JSON.parse(response.data.questions)
            setQuiz(quiz)
        } catch (error) {
            console.error("Error fetching quizzes:", error)
            toast({
                title: "Error",
                description: "Failed to fetch quizzes",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={() => navigate("/admin")} variant="default">
                    <ArrowLeft/>
                    Back
                </Button>
                <h1 className="text-2xl font-semibold">Quiz</h1>
            </div>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Quiz Id: {quizCode}</span>
                        <span>{quiz.length} Questions</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {quiz.map((question, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        <span>Question {index + 1}</span>
                                        <span>{question.category}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-semibold">{question.question}</p>
                                    <ul className="mt-2 space-y-1">
                                        {question.options.map((option, optionIndex) => (
                                            <li key={optionIndex}
                                                className={`rounded p-2 ${optionIndex === question.answer ? "bg-green-300" : "bg-gray-100"}`}>
                                                {option}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

