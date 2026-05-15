import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import DashboardScreen from '../screens/teacher/DashboardScreen';
import ClassScreen from '../screens/teacher/ClassScreen';
import ChapterScreen from '../screens/teacher/ChapterScreen';
import SectionScreen from '../screens/teacher/SectionScreen';
import CreateQuestionScreen from '../screens/teacher/CreateQuestionScreen';
import QuestionDetailScreen from '../screens/teacher/QuestionDetailScreen';
import QuestionPreviewScreen from '../screens/teacher/QuestionPreviewScreen';
import QuestionBankScreen from '../screens/teacher/QuestionBankScreen';
import QuestionPickerScreen from '../screens/teacher/QuestionPickerScreen';
import StudentDashboardScreen from '../screens/student/DashboardScreen';
import StudentCourseScreen from '../screens/student/CourseScreen';
import StudentSectionScreen from '../screens/student/SectionScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'TEACHER' ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Class" component={ClassScreen} />
          <Stack.Screen name="Chapter" component={ChapterScreen} />
          <Stack.Screen name="Section" component={SectionScreen} />
          <Stack.Screen name="CreateQuestion" component={CreateQuestionScreen} />
          <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
          <Stack.Screen name="QuestionPreview" component={QuestionPreviewScreen} />
          <Stack.Screen name="QuestionBank" component={QuestionBankScreen} />
          <Stack.Screen name="QuestionPicker" component={QuestionPickerScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
          <Stack.Screen name="StudentCourse" component={StudentCourseScreen} />
          <Stack.Screen name="StudentSection" component={StudentSectionScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
