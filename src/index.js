//require('dotenv').config({ path: './env' });
 import connectDB from "./db/index.js";
 import mongoose from "mongoose";
import app from "./app.js"

 import dotenv from "dotenv";


 dotenv.config({
    path:'./.env'
})



connectDB()
.then(()=>{
   app.listen(process.env.PORT || 8000, ()=>{
      console.log(`Server is Running at port : ${process.env.PORT}`);
   })
})
.catch((err) => {
   console.log("MONGO db connection failed !!! ",err);
})




//             throw error
//         })

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("ERROR: " , error)
//         throw err
//     }
//  })()


