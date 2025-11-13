import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { users } from "@/db/schema"

const HomePage = async () => {
  const allUsers = await db.select().from(users)

  return (
    <div>
      <Button>Button</Button>
      <p>{JSON.stringify(allUsers)}</p>
    </div>
  )
}

export default HomePage