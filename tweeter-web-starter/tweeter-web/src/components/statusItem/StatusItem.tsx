import { Link } from "react-router-dom";
import Post from "./Post";
import useUserNavigationHook from "../navigate/UserNavigationHooks";
import { Status } from "tweeter-shared";

interface Props {
  status: Status;
  featurePath: string;
}

const StatusItem = (props: Props) => {
const navigatetoUser = useUserNavigationHook();

  return (
    <div className="col bg-light mx-0 px-0">
        <div className="container px-0">
            <div className="row mx-0 px-0">
            <div className="col-auto p-3">
                <img
                src={props.status.user.imageUrl}
                className="img-fluid"
                width="80"
                alt="Posting user"
                />
            </div>
            <div className="col">
                <h2>
                <b>
                    {props.status.user.firstName} {props.status.user.lastName}
                </b>{" "}
                -{" "}
                <Link
                    to={`/feed/${props.status.user.alias}`}
                    onClick={(event) => navigatetoUser.navigateToUser(event, props.featurePath)}
                >
                    {props.status.user.alias}
                </Link>
                </h2>
                {props.status.formattedDate}
                <br />
                <Post status={props.status} featurePath={props.featurePath} />
            </div>
            </div>
        </div>
    </div>
  );
};

export default StatusItem;
