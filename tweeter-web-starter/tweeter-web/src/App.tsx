import "./App.css";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Login from "./components/authentication/login/Login";
import Register from "./components/authentication/register/Register";
import MainLayout from "./components/mainLayout/MainLayout";
import Toaster from "./components/toaster/Toaster";
import UserItemScroller from "./components/mainLayout/UserItemScroller";
import StatusItemScroller from "./components/mainLayout/StatusItemScroller";
import { useUserInfoHook } from "./components/userInfo/UserInfoHooks";
import { FolloweePresenter } from "./presenter/FolloweePresenter";
import { FollowerPresenter } from "./presenter/FollowerPreseter";
import { FeedPresenter } from "./presenter/FeedPresenter";
import { StoryPresenter } from "./presenter/StoryPresenter";
import { LoginPresenter, LoginView } from "./presenter/LoginPresenter";
import { RegisterPresenter, RegisterView } from "./presenter/RegisterPresenter";
import { PagedItemPresenter, PagedItemView } from "./presenter/PagedItemPresenter";
import { Status, User } from "tweeter-shared";
import { UserService } from "./model.service/UserService";
import { StatusService } from "./model.service/StatusService";
import ItemScroller from "./components/mainLayout/ItemScroller";
import StatusItem from "./components/statusItem/StatusItem";
import UserItem from "./components/userItem/UserItem";
import { FollowService } from "./model.service/FollowService";

const App = () => {
  const { currentUser, authToken } = useUserInfoHook();

  const isAuthenticated = (): boolean => {
    return !!currentUser && !!authToken;
  };

  return (
    <div>
      <Toaster position="top-right" />
      <BrowserRouter>
        {isAuthenticated() ? (
          <AuthenticatedRoutes />
        ) : (
          <UnauthenticatedRoutes />
        )}
      </BrowserRouter>
    </div>
  );
};


// interface Props<T extends User | Status, U extends UserService | StatusService> {
//     featureURL: string, 
//     presenterFactory: (listener : PagedItemView<T>) => PagedItemPresenter<T, U>
//     ItemComponent: React.ComponentType<{ data: T, featurePath: string }>;
// }

/* <props.ItemComponent data={item} featurePath={props.featureURL} /> */

const AuthenticatedRoutes = () => {
  const { displayedUser } = useUserInfoHook();


  const scrollerCreation = <T extends User| Status, U extends StatusService | FollowService>(
    key : string, 
    featureUrl : string, 
    operation : (view : PagedItemView<T>) => PagedItemPresenter<T,U>,
    itemComponent : React.ComponentType<{ data: T, featurePath: string }>
    ) : JSX.Element => 
    {

    // callback: <T>(input: T) => T 
      return (
        <ItemScroller<T,U> 
        key={key}
        featureUrl={featureUrl}
        presenterFactory={operation}      
        ItemComponent= {itemComponent}
        />
      )
    }


  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to={`/feed/${displayedUser!.alias}`} />} />
        
        <Route path="feed/:displayedUser" 
        key={`feed -${displayedUser!.alias }`}
        element={
        scrollerCreation(
        `feed-${displayedUser!.alias }`,
        "/feed",
        (view: PagedItemView<Status>) => new FeedPresenter(view),
        StatusItem 
        )} />
        
        <Route path="story/:displayedUser" 
        key={`story -${displayedUser!.alias }`}
        element={
        scrollerCreation(
        `story-${displayedUser!.alias }`,
        "/story",
        (view: PagedItemView<Status>) => new StoryPresenter(view),
        StatusItem
        )} />
        
        <Route path="followees/:displayedUser"
        key={`followees -${displayedUser!.alias }`}
        element={
        scrollerCreation(
        `followees-${displayedUser!.alias }`,
        "/followees",
        (view: PagedItemView<User>) => new FolloweePresenter(view),
        UserItem
        )} /> 
      
        
        <Route path="followers/:displayedUser" 
        key={`followers -${displayedUser!.alias }`}
        element={
        scrollerCreation( 
        `followers-${displayedUser!.alias }`,
        "/followers",
        (view: PagedItemView<User>) => new FollowerPresenter(view),
        UserItem 
        )}/> 
                
        <Route path="logout" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={`/feed/${displayedUser!.alias}`} />} />
      </Route>
    </Routes>
  );
};

const UnauthenticatedRoutes = () => {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/login" element={<Login presenterFactory={(view: LoginView) => new LoginPresenter(view)} />} />
      <Route path="/register" element={<Register presenterFactory={(view: RegisterView) => new RegisterPresenter(view)} />} />
      <Route path="*" element={<Login presenterFactory={(view: LoginView) => new LoginPresenter(view)} originalUrl={location.pathname} />} />
    </Routes>
  );
};

export default App;
