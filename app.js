import express from 'express';
import axios from 'axios';
import qs from 'qs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';


const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors({
    exposedHeaders: ["Authorization"],
}))

const CLIENT_ID = '8e93eaeaded45bab5247d4260ffa68d5';
const REDIRECT_URI = 'http://43.201.51.203:3000/auth/kakao/callback';

// app.get('/', (req, res) => {
//     res.send(`
//         <h1>login</h1>
//         <a href="/login">sign in</a>
//     `)
// });

// app.get('/login', (req, res) => {
//     const url=`https://kauth.kakao.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
//     res.redirect(url);
// });

app.get('/auth/kakao/callback', async function(req, res){
    const {code} = req.query;

    try{
        const response = await axios({
            method: 'POST',
            url: 'https://kauth.kakao.com/oauth/token',
            headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            data: qs.stringify({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                code: code
            })
        })

        const {access_token} = response.data;

        const userResponse = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        })

        const finduser = await prisma.kakaoUsers.findFirst({where : {kakaouserEmail : userResponse.data.kakao_account.email}})
        if(finduser){
            const token = jwt.sign({userEmail : finduser.kakaouserEmail}, 'secret');
            return res.setHeader('Authorization', token).redirect('http://localhost:3000/auth/kakao/callback');
        }else {
            await prisma.kakaoUsers.create({
                data : {
                    kakaouserEmail : userResponse.data.kakao_account.email,
                    kakaouserImage : userResponse.data.properties.profile_image,
                    kakaouserName : userResponse.data.properties.nickname
                }
            })
            return res.status(200).json({message : "회원가입 성공"});
        }
        // console.log(userResponse.data.properties.nickname);
        // console.log(userResponse.data.properties.profile_image);
        // console.log(userResponse.data.kakao_account.email);
        // res.redirect('/');
    }catch(err) {
        console.error(err);
    }
})

app.listen(3000, () => {
    console.log('SERVER OPEN');
});