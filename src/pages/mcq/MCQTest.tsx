import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CircleCheck,
  Clock,
  Mic,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { questions } from "@/constants/constants";
import { useAuth } from "@/auth/AuthContext";
import { cn, formatTime } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Warning } from "@/types/Warning";
import { Progress } from "@/components/ui/progress";

const MCQTest = () => {
  const { isAuthenticated, logout } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [selectedAnswers, setSelectedAnswers] = useState(
    Array(questions.length).fill(null)
  );
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [testTerminated, setTestTerminated] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState({
    title: "",
    description: "",
  });

  const warningsRef = useRef(warnings);
  warningsRef.current = warnings;

  const showAlert = (title: string, description: string) => {
    setAlertDialogContent({ title, description });
    setShowAlertDialog(true);
  };

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      showAlert("Test Completed", "Your results will be displayed shortly.");
      setTimeRemaining(0);
      setShowResults(true);
    }
  }, [currentQuestion]);

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
    },
    [currentQuestion]
  );

  const calculateScore = () => {
    return selectedAnswers.reduce(
      (score, answer, index) =>
        answer === questions[index].answer ? score + 1 : score,
      0
    );
  };

  const restartTest = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(Array(questions.length).fill(null));
    setTimeRemaining(3600);
    setWarnings([]);
    setShowResults(false);
  };

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionsGranted(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setPermissionsGranted(false);
    }
    setShowPermissionDialog(false);
  };

  const addWarning = useCallback((message: string) => {
    const newWarning = { id: Date.now(), message };
    setWarnings((prev) => [...prev, newWarning]);
    setTimeout(
      () => setWarnings((prev) => prev.filter((w) => w.id !== newWarning.id)),
      5000
    );
  }, []);

  const removeWarning = useCallback((id: number) => {
    setWarnings((prev) => prev.filter((warning) => warning.id !== id));
  }, []);

  const terminateTest = useCallback(() => {
    setTestTerminated(true);
    showAlert(
      "Test Terminated",
      "The test has been terminated due to multiple violations of test rules."
    );
  }, []);

  useEffect(() => {
    if (testTerminated) {
      showAlert(
        "Test Terminated",
        "The test has been terminated due to multiple violations of test rules."
      );
    }
  }, [testTerminated]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setPermissionsGranted(true);
      } catch (err) {
        setPermissionsGranted(false);
      }
    };

    if (isAuthenticated) {
      checkPermissions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          showAlert("Time's Up", "The test has ended.");
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResults]);

  useEffect(() => {
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
  }, [addWarning]);

  useEffect(() => {
    if (warningsRef.current.length >= 3 && !testTerminated) {
      terminateTest();
    }
  }, [warnings, testTerminated, terminateTest]);

  if (testTerminated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Test Terminated</h2>
            <p>
              The test has been terminated due to multiple violations of test
              rules.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>MCQ Test</span>
            {!showResults && (
              <div className="flex flex-row items-center space-x-2 justify-center">
                <Clock />
                <span className="text-lg font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permissionsGranted ? (
            showResults ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Test Results</h2>
                <p>
                  Your score: {calculateScore()} out of {questions.length}
                </p>
                <Progress
                  value={(calculateScore() / questions.length) * 100}
                  className="w-full"
                />
                <Button onClick={restartTest} className="w-full">
                  Restart Test
                </Button>
                <Button onClick={logout} variant="outline" className="w-full">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                  >
                    <ArrowLeft />
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={!permissionsGranted}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={!permissionsGranted}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress
                    value={(currentQuestion / questions.length) * 100}
                    className="w-full"
                  />
                  <h3 className="font-bold">Question {currentQuestion + 1}</h3>
                  <p>{questions[currentQuestion].question}</p>
                  {questions[currentQuestion].options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        `w-full justify-start ${
                          selectedAnswers[currentQuestion] === index
                            ? "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
                            : ""
                        }`
                      )}
                      onClick={() => handleSelectAnswer(index)}
                    >
                      <span className="flex w-full items-center justify-between">
                        {option}
                        {selectedAnswers[currentQuestion] === index && (
                          <CircleCheck className="ml-2 !h-5 !w-5" />
                        )}
                      </span>
                    </Button>
                  ))}
                </div>
                <Button onClick={handleNextQuestion} className="w-full">
                  {currentQuestion < questions.length - 1
                    ? "Next Question"
                    : "Submit"}
                </Button>
              </div>
            )
          ) : (
            <div className="text-center">
              <p>Camera and microphone access is required to proceed.</p>
              <Button
                onClick={() => setShowPermissionDialog(true)}
                className="mt-4 w-full"
              >
                Grant Permissions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Camera and Microphone Access</AlertDialogTitle>
            <AlertDialogDescription>
              This test requires access to your camera and microphone. Please
              grant permission to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={requestPermissions}>
              Grant Permissions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {warnings.map((warning, index) => (
        <Alert
          key={index}
          variant="destructive"
          className="fixed top-4 right-4 w-96 bg-red-600 text-white"
        >
          <AlertCircle className="h-4 w-4 !text-white" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>{warning.message}</AlertDescription>
          <Button
            className="fixed top-2 right-2 h-6 w-4 bg-white text-black rounded-full flex items-center justify-center shadow-sm"
            variant="ghost"
            size="icon"
            onClick={() => removeWarning(warning.id)}
          >
            <div>
              <X className="h-4 w-4 absolute left-[0.4rem] top-1" />
            </div>
          </Button>
        </Alert>
      ))}
    </div>
  );
};

export default MCQTest;
