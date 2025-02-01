import {useState} from "react"
import {useNavigate} from "react-router"
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {useToast} from "@/hooks/use-toast"
import {useAuth} from "@/auth/AuthContext"

const StartupPage = () => {
    const [quizCode, setQuizCode] = useState("")
    const navigate = useNavigate()
    const {toast} = useToast()
    const {user} = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (quizCode.trim()) {
            navigate(`/camera-check?quizCode=${quizCode}`)
        } else {
            toast({
                title: "Invalid Quiz Code",
                description: "Please enter a valid quiz code.",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardContent className="p-6">
                    <h1 className="text-2xl font-bold mb-4 text-center">Welcome to the MCQ Test</h1>
                    <p className="mb-4 text-center">Hello, {user?.name || "User"}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Enter Quiz Code"
                            value={quizCode}
                            onChange={(e) => setQuizCode(e.target.value)}
                            required
                        />
                        <Button type="submit" className="w-full">
                            Start Test
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default StartupPage

