import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import TabBar from '../components/base/TabBar';

// Student screens
import CourseTrailScreen from '../screens/student/CourseTrailScreen';
import StudentClassScreen from '../screens/student/StudentClassScreen';
import SectionScreen from '../screens/student/SectionScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import SettingsScreen from '../screens/student/SettingsScreen';

// Teacher screens
import TeacherHomeScreen from '../screens/teacher/TeacherHomeScreen';
import ClassDetailScreen from '../screens/teacher/ClassDetailScreen';
import ChapterDetailScreen from '../screens/teacher/ChapterDetailScreen';
import QuestionBankScreen from '../screens/teacher/QuestionBankScreen';
import QuestionEditorScreen from '../screens/teacher/QuestionEditorScreen';

const Stack = createNativeStackNavigator();
const StudentTab = createBottomTabNavigator();
const TeacherTab = createBottomTabNavigator();

function StudentTabNavigator() {
  return (
    <StudentTab.Navigator
      tabBar={props => <TabBar {...props} role="STUDENT" />}
      screenOptions={{ headerShown: false }}
    >
      <StudentTab.Screen name="Home"    component={CourseTrailScreen} />
      <StudentTab.Screen name="Class"   component={StudentClassScreen} />
      <StudentTab.Screen name="Profile" component={ProfileScreen} />
    </StudentTab.Navigator>
  );
}

function TeacherTabNavigator() {
  return (
    <TeacherTab.Navigator
      tabBar={props => <TabBar {...props} role="TEACHER" />}
      screenOptions={{ headerShown: false }}
    >
      <TeacherTab.Screen name="TeacherHome"  component={TeacherHomeScreen} />
      <TeacherTab.Screen name="QuestionBank" component={QuestionBankScreen} />
    </TeacherTab.Navigator>
  );
}

export default function MainNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'TEACHER' ? (
        <>
          <Stack.Screen name="TeacherTabs"   component={TeacherTabNavigator} />
          <Stack.Screen name="ClassDetail"   component={ClassDetailScreen} />
          <Stack.Screen name="ChapterDetail" component={ChapterDetailScreen} />
          <Stack.Screen name="QuestionEditor" component={QuestionEditorScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="StudentTabs"    component={StudentTabNavigator} />
          <Stack.Screen name="StudentSection" component={SectionScreen} />
          <Stack.Screen name="Settings"       component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
