import {useCallback, useEffect, useRef, useState} from "react";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {AlertCircle} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {jsPDF} from "jspdf";
import autoTable from "jspdf-autotable";
import {formatTime} from "@/lib/utils";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Warning} from "@/types/Warning";
import {Progress} from "@/components/ui/progress";
import {TestState} from "@/types/TestState";
import {useLocation, useNavigate, useParams} from "react-router";
import {Question} from "@/types/Question";
import {useToast} from "@/hooks/use-toast";
import axios from "axios";
import io, {Socket} from "socket.io-client";
import {useAuth} from "@/auth/AuthContext.tsx";

const INITIAL_TIME = 3600; // 1 hour in seconds
const WARNING_LIMIT = 10;
const LOCAL_STORAGE_KEY = "testState";

const MCQTest = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
    const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [testTerminated, setTestTerminated] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0)
    const [showAlertDialog, setShowAlertDialog] = useState(false);
    const [alertDialogContent, setAlertDialogContent] = useState({
        title: "",
        description: "",
    });
    const [testStartTime, setTestStartTime] = useState(new Date())
    const [timeSpent, setTimeSpent] = useState(0)
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionError, setConnectionError] = useState(false);

    const {toast} = useToast()
    const {logout, user} = useAuth()
    const params = useParams();
    const quizCode = params.quizCode;
    const location = useLocation()
    const navigate = useNavigate()
    const videoRef = useRef<HTMLVideoElement>(null)
    const socketRef = useRef<Socket | null>(null)
    // const micStreamRef = useRef<MediaStream | null>(null)
    const timerRef = useRef<number | null>(null)


    useEffect(() => {
        if (quizCode) {
            fetchQuestions(quizCode)
            setupSocketWithRetry()
            setupVideoProctoring()
            // setupMicrophoneMonitoring()
            setTestStartTime(new Date())
        } else {
            toast({
                title: "Invalid Quiz Code",
                description: "No quiz code provided. Please start over.",
                variant: "destructive",
            })
            navigate("/")
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect()
            }
        }
    }, [location, toast, navigate])

    const saveState = useCallback(() => {
        const state: TestState = {
            currentQuestion,
            selectedAnswers,
            timeRemaining,
            warnings: JSON.stringify(warnings),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }, [currentQuestion, selectedAnswers, timeRemaining, warnings]);

    const loadState = useCallback(() => {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const state: TestState = JSON.parse(savedState);
            setCurrentQuestion(state.currentQuestion);
            setSelectedAnswers(state.selectedAnswers);
            setTimeRemaining(state.timeRemaining);
            setWarnings(JSON.parse(state.warnings) as Warning[]);
        }
    }, []);

    // Internet connection handling
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            loadState();
        };

        const handleOffline = () => {
            setIsOnline(false);
            saveState();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [loadState, saveState]);

    // Auto-save state
    useEffect(() => {
        const interval = setInterval(saveState, 5000); // Save every 5 seconds
        return () => clearInterval(interval);
    }, [saveState]);

    const fetchQuestions = async (quizCode: string) => {
        try {
            const response = await axios.get(`http://127.0.0.1:5000/api/quiz/${quizCode}`)
            const data = response.data
            const formattedQuestions = JSON.parse(data.questions)
            formattedQuestions.forEach((question: Question, index: number) => {
                question.id = index + 1
            })
            console.log(formattedQuestions)
            setQuestions(formattedQuestions)
            setSelectedAnswers(new Array(formattedQuestions.length).fill(null))
        } catch (error) {
            console.error("Error fetching questions:", error)
            toast({
                title: "Error",
                description: "Failed to fetch questions. Please try again.",
                variant: "destructive",
            })
        }
    };

    const setupVideoProctoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                // micStreamRef.current = stream

                setupSocketWithRetry();

            }
        } catch (error) {
            console.error("Error accessing media devices:", error)
            setConnectionError(true)
            toast({
                title: "Error",
                description: "Failed to access camera and microphone",
                variant: "destructive",
            })
        }
    }

    const captureAndEmitFrame = () => {
        if (!videoRef.current || !socketRef.current?.connected) return;

        const canvas = document.createElement('canvas');
        const video = videoRef.current;

        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get base64 data, removing the data URL prefix
        const frame = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = frame.split(',')[1];

        // Emit the frame data
        socketRef.current.emit('video_frame', {
            frame: base64Data,
            timestamp: Date.now()
        });
    };

// Use this in useEffect
    useEffect(() => {
        if (!videoRef.current || !socketRef.current) return;

        const interval = setInterval(captureAndEmitFrame, 1000);

        return () => clearInterval(interval);
    }, [videoRef.current, socketRef.current]);

    const addWarning = useCallback(
        (message: string) => {
            setWarnings((prev) => [...prev, {id: Date.now(), message}]);
            toast({
                title: "Warning",
                description: message,
                variant: "destructive",
            })
        },
        [toast]
    );

    const setupSocketWithRetry = () => {
        const connectSocket = () => {
            socketRef.current = io('http://127.0.0.1:5000', {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });

            socketRef.current.on('connect', () => {
                setConnectionError(false);
            });

            socketRef.current.on('connect_error', () => {
                setConnectionError(true);
            });

            socketRef.current.on('proctoring_alert', handleProctoringAlert);

        };

        connectSocket();
    };

    const handleProctoringAlert = (data: { message: string; warning: boolean }) => {
        if (data.warning) {
            addWarning(data.message);
            toast({
                title: "Warning",
                description: data.message,
                variant: "destructive",
            });
        }
    };


    useEffect(() => {
        if (showResults) {
            return;
        }
        const handleVisibilityChange = () => {
            if (document.hidden) {
                addWarning(
                    "You have navigated away from the test window. This action has been recorded."
                );
            }
        };

        const handleBlur = () => {
            addWarning("Test window lost focus. This action has been recorded.");
        };

        const handleMouseLeave = () => {
            addWarning("Mouse left the test window. This action has been recorded.");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [addWarning, showResults]);

    // const setupMicrophoneMonitoring = () => {
    //     setInterval(() => {
    //         if (micStreamRef.current && micStreamRef.current.active) return;
    //         addWarning("Microphone is not active. Please check your microphone.");
    //     }, 3000)
    // }

    const handleNextQuestion = useCallback(() => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            submitQuiz()
        }
    }, [currentQuestion, questions.length]);

    const handlePreviousQuestion = useCallback(() => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    }, [currentQuestion]);

    const handleSelectAnswer = useCallback(
        (index: number) => {
            setSelectedAnswers((prev) => {
                const newAnswers = [...prev];
                newAnswers[currentQuestion] = index;
                return newAnswers;
            });

            if (index === questions[currentQuestion].answer) {
                toast({
                    title: "Correct!",
                    description: "You've selected the right answer.",
                    variant: "default",
                })
            } else {
                toast({
                    title: "Incorrect",
                    description: "That's not the right answer. Try again!",
                    variant: "destructive",
                })
            }
        },
        [currentQuestion]
    );

    const submitQuiz = async () => {
        try {
            const calculatedScore = calculateScore()
            setScore(calculatedScore)

            await axios.post("http://127.0.0.1:5000/api/submit-quiz", {
                userId: user?.id,
                quizId: quizCode,
                answers: selectedAnswers,
                score: calculatedScore,
            })

            toast({
                title: "Quiz submitted",
                description: isOnline
                    ? "Your answers have been recorded"
                    : "Your answers will be submitted when you're back online",
            })
            setShowResults(true)
        } catch (error) {
            console.error("Error submitting quiz:", error)
            toast({
                title: "Error",
                description: "Failed to submit quiz",
                variant: "destructive",
            })
        }
    }


    const terminateTest = () => {
        setTestTerminated(true);
        showAlert(
            "Test Terminated",
            "The test has been terminated due to multiple violations of test rules."
        );
    };

    const restartTest = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        navigate("/");
    };

    const showAlert = (title: string, description: string) => {
        setShowAlertDialog(true);
        setAlertDialogContent({title, description});
    };

    const calculateScore = () => {
        return questions.reduce((acc, question, index) => {
            return acc + (selectedAnswers[index] === question.answer ? 1 : 0)
        }, 0)
    }

    const generatePDFReport = useCallback(() => {
        const doc = new jsPDF();
        // const score = calculateScore();
        const completionTime = new Date();

        // Add title
        doc.setFontSize(16);
        doc.text("Test Report", 14, 15);

        // Add user statistics
        doc.setFontSize(12);
        doc.text("", 14, 20); // Add gap

        // Test Summary Table
        autoTable(doc, {
            head: [["Candidate Email", "Test Start", "Test End", "Score"]],
            body: [
                [
                    user?.email || "N/A",
                    testStartTime.toLocaleString(),
                    completionTime.toLocaleString(),
                    `${score} / ${questions.length} (${(
                        (score / questions.length) *
                        100
                    ).toFixed(2)}%)`,
                ],
            ],
            startY: 25,
        });

        // Time and Warnings Table
        autoTable(doc, {
            head: [["Time Spent", "Warnings Received"]],
            body: [
                [`${formatTime(timeSpent)}`, `${warnings.length} / ${WARNING_LIMIT}`],
            ],
            startY: (doc as any).lastAutoTable.finalY + 10,
        });

        // Questions and Answers Table
        const questionData = questions.map((q, index) => [
            `Q${index + 1}: ${q.question}`,
            selectedAnswers[index] !== null
                ? q.options[selectedAnswers[index]]
                : "Not answered",
            selectedAnswers[index] === q.answer ? "Correct" : "Incorrect",
            q.options[q.answer],
        ]);

        autoTable(doc, {
            head: [["Question", "Your Answer", "Result", "Correct Answer"]],
            body: questionData,
            startY: (doc as any).lastAutoTable.finalY + 10,
            styles: {cellWidth: "wrap"},
            columnStyles: {
                0: {cellWidth: 55},
                1: {cellWidth: 45},
                2: {cellWidth: 30},
                3: {cellWidth: 50},
            },
        });

        doc.save(`test-report-${new Date().toISOString()}.pdf`);
    }, [
        questions,
        selectedAnswers,
        testStartTime,
        timeSpent,
        user?.email,
        warnings.length
    ]);

    // Timer logic
    useEffect(() => {
        if (showResults || testTerminated) {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            return
        }

        setTestStartTime(new Date())

        const timer = window.setInterval(() => {
            setTimeRemaining((prev) => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    clearInterval(timer);
                    setShowResults(true);
                    showAlert("Time's Up", "The test has ended.");
                    return 0;
                }
                return newTime;
            });

            setTimeSpent((prev) => prev + 1);
        }, 1000);

        timerRef.current = timer;

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [showResults, testTerminated]);

    useEffect(() => {
        if (warnings.length > WARNING_LIMIT) {
            terminateTest();
        }
    }, [warnings]);

    if (questions.length === 0) {
        return <div>Loading...</div>
    }

    if (testTerminated) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4"/>
                        <h2 className="text-2xl font-bold mb-2">Test Terminated</h2>
                        <p>
                            The test has been terminated due to multiple violations (
                            {WARNING_LIMIT}) of test rules.
                        </p>
                        <Button onClick={restartTest} className="mt-4" variant="outline">
                            Restart Test
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div
                className="fixed transition-all duration-300 ease-in-out top-4 right-4 w-64 h-48 rounded-lg overflow-hidden shadow-lg">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
            </div>

            {connectionError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>
                        There was an error connecting to the proctoring service. Please check your connection.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="w-full max-w-4xl mt-14">
                <CardHeader className="flex flex-col items-center">
                    <h1 className="text-3xl font-bold">MCQ Test</h1>
                </CardHeader>
                <CardContent className="p-6">
                    {!isOnline && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertTitle>Offline Mode</AlertTitle>
                            <AlertDescription>
                                You are currently offline. Your progress will be saved and
                                synced when you reconnect.
                            </AlertDescription>
                        </Alert>
                    )}

                    {showResults ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Test Results</h2>
                                <div className="bg-white p-6 rounded-lg shadow-sm">
                                    <p className="text-4xl font-bold text-primary mb-2">
                                        {score} / {questions.length}
                                    </p>
                                    <Progress
                                        value={(score / questions.length) * 100}
                                        className="w-full h-2 mb-4"
                                    />
                                    <p className="text-gray-600">
                                        Time taken: {formatTime(INITIAL_TIME - timeRemaining)}
                                    </p>
                                    <p className="text-lg">
                                        Score: {score} out of {questions.length}
                                    </p>
                                    {/* Add performance message based on score */}
                                    <p className="mt-2 text-lg">
                                        {score === questions.length ? (
                                            <span className="text-green-600">Perfect Score! 🎉</span>
                                        ) : score >= questions.length * 0.7 ? (
                                            <span className="text-green-500">Great job! 👏</span>
                                        ) : score >= questions.length * 0.5 ? (
                                            <span className="text-yellow-500">Good effort! Keep practicing! 💪</span>
                                        ) : (
                                            <span className="text-red-500">Need more practice. Don't give up! 📚</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button onClick={generatePDFReport} variant="outline">
                                    Download Report
                                </Button>
                                <Button onClick={restartTest}>Restart Test</Button>
                                <Button
                                    onClick={logout}
                                    variant="destructive"
                                    className="md:col-span-2"
                                >
                                    Logout
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="text-right">
                                    <p className="text-sm text-gray-600 text-left">Time Remaining</p>
                                    <p className="text-2xl font-bold">
                                        {formatTime(timeRemaining)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Progress
                                    value={(currentQuestion / questions.length) * 100}
                                    className="w-full"
                                />
                                <div className="bg-white p-6 rounded-lg shadow-sm">
                                    <h3 className="text-xl font-bold mb-4">
                                        Question {currentQuestion + 1} of {questions.length}
                                    </h3>
                                    <p className="mb-6">
                                        {questions[currentQuestion].question}
                                    </p>
                                    <div className="space-y-3">
                                        {questions[currentQuestion].options.map(
                                            (option, index) => (
                                                <Button
                                                    key={index}
                                                    variant={
                                                        selectedAnswers[currentQuestion] === index
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className="w-full justify-start text-left"
                                                    onClick={() => handleSelectAnswer(index)}
                                                >
                                                    {option}
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button
                                    onClick={handlePreviousQuestion}
                                    disabled={currentQuestion === 0}
                                    variant="outline"
                                >
                                    Previous
                                </Button>
                                <Button onClick={handleNextQuestion} className="ml-4">
                                    {currentQuestion < questions.length - 1 ? "Next" : "Finish"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertDialogContent.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowAlertDialog(false)}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MCQTest;
