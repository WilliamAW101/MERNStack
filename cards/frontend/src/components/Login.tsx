import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
function Login()
{
    function handleSetLoginName( e: any ) : void
{
setLoginName( e.target.value );
}
function handleSetPassword( e: any ) : void
{
setPassword( e.target.value );
}
const navigate = useNavigate();
const [message,setMessage] = useState('');
const [loginName,setLoginName] = useState('');
const [loginPassword,setPassword] = useState('');
function doLogin(event:any) : void
{
    event.preventDefault();
    alert('doIt() ' + loginName + ' ' + loginPassword);
    navigate('/cards');
};
return(
<div id="loginDiv">
<span id="inner-title">PLEASE LOG IN</span><br />
Login: <input type="text" id="loginName" placeholder="Username"
onChange={handleSetLoginName} />
Password: <input type="password" id="loginPassword" placeholder="Password"
onChange={handleSetPassword} />
<input type="submit" id="loginButton" className="buttons" value = "Do It"
onClick={doLogin} />
<span id="loginResult">{message}</span>
</div>
);
};
export default Login;
