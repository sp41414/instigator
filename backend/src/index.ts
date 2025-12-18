import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`App listening on port ${PORT}`);
});
