import { Link } from "react-router-dom";
import { User } from "tweeter-shared";
import useUserNavigationHook from "../navigate/UserNavigationHooks";

interface Props {
  data: User;
  featurePath: string;
}

const UserItem = (props: Props) => {
const navigatetoUser = useUserNavigationHook();
  
  return (
    <div className="col bg-light mx-0 px-0">
      <div className="container px-0">
        <div className="row mx-0 px-0">
          <div className="col-auto p-3">
            <img
              src={props.data.imageUrl}
              className="img-fluid"
              width="80"
              alt="Posting user"
            />
          </div>
          <div className="col">
            <h2>
              <b>
                {props.data.firstName} {props.data.lastName}
              </b>{" "}
              -{" "}
              <Link
                to={`${props.featurePath}/${props.data.alias}`}
                onClick={(event) => navigatetoUser.navigateToUser(event)}
              >
                {props.data.alias}
              </Link>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserItem;
